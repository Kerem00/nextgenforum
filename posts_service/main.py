from fastapi import FastAPI, Depends, HTTPException, Response, BackgroundTasks
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import asyncio
from typing import Annotated
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, text
from . import models, schemas, database, consumer, auth
from .ml_mod import ml_mod
from .config import CONFIDENCE_THRESHOLD, OLLAMA_URL, OLLAMA_MODEL, CATEGORIES

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    
    try:
        async with database.engine.begin() as conn:
            await conn.execute(text("ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'pending'"))
    except Exception:
        pass

    try:
        async with database.engine.begin() as conn:
            await conn.execute(text("ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_assist JSON"))
    except Exception as e:
        pass

    try:
        async with database.engine.begin() as conn:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_meta JSON"))
    except Exception as e:
        pass
        print("Failed to add profile_meta column:", e)
    
    from .config import AUTOMOD_USERNAME
    async with database.AsyncSessionLocal() as db:
        res = await db.execute(select(models.User).where(models.User.username == AUTOMOD_USERNAME))
        am_user = res.scalar_one_or_none()
        if not am_user:
            am_user = models.User(id=0, username=AUTOMOD_USERNAME, email="automod@system.local", role="automod")
            db.add(am_user)
            
        res_cfg = await db.execute(select(models.AutoModConfig).where(models.AutoModConfig.id == 1))
        am_cfg = res_cfg.scalar_one_or_none()
        if not am_cfg:
            initial_prompt = """You are an expert AI forum moderator and content analyst.
Your task is to analyze user-submitted forum posts and return structured data to our backend system.

### INSTRUCTIONS:
1. TOXICITY ANALYSIS: Evaluate the content for toxicity. Set 'is_toxic' to true ONLY if the content contains explicit hate speech, targeted harassment, severe profanity, spam, or illegal material. Strong dissenting opinions or mild frustration are NOT toxic. If flagged as toxic, provide a brief 1-sentence explanation in 'toxicity_reason'.
2. TITLE SUGGESTIONS: Generate exactly 3 relevant, engaging, and clear titles for the post. Avoid clickbait. Keep each title under 60 characters.
3. CATEGORY ASSIGNMENT: Assign the single most appropriate category from this exact list: [ALLOWED_CATEGORIES]. Do not invent new categories.
4. LANGUAGE DETECTION: If the content is not in English, return the title suggestions in that language.

### OUTPUT SCHEMA:
You must respond strictly with raw, valid JSON. Do NOT wrap the response in markdown code blocks (e.g., do not use ```json). Do not include any conversational filler. 

{
  "is_toxic": boolean,
  "toxicity_reason": string | null,
  "title_suggestions": [string, string, string],
  "suggested_category": string
}

### CONTENT TO ANALYZE:
<post_content>
[CONTENT]
</post_content>"""
            am_cfg = models.AutoModConfig(id=1, llm_prompt=initial_prompt, auto_comments={}, llm_model=OLLAMA_MODEL)
            db.add(am_cfg)
        
        await db.commit()
    
    # Start consumer in background
    task = asyncio.create_task(consumer.consume_events())
    
    yield
    
    # Cleanup if needed (task.cancel() etc)


import json
import httpx

import re

async def run_ai_assist(post_id: int):
    async with database.AsyncSessionLocal() as db:
        result = await db.execute(select(models.Post).where(models.Post.id == post_id))
        post = result.scalar_one_or_none()
        if not post:
            return
        
        content = post.content
        
        cfg_res = await db.execute(select(models.AutoModConfig).where(models.AutoModConfig.id == 1))
        am_cfg = cfg_res.scalar_one_or_none()
        if not am_cfg: return
        
        allowed_categories_list = [c["label"] for c in CATEGORIES]
        allowed_categories = str(allowed_categories_list)

        def replace_tags(match):
            tag = match.group(0)
            if tag == "[ALLOWED_CATEGORIES]": return allowed_categories
            if tag == "[CONTENT]": return content
            return tag

        prompt = re.sub(r'\[ALLOWED_CATEGORIES\]|\[CONTENT\]', replace_tags, am_cfg.llm_prompt)
        
        payload = {
            "model": am_cfg.llm_model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(OLLAMA_URL, json=payload)
                response.raise_for_status()
                result = response.json()
                raw_text = result.get("response", "").strip()
                parsed_json = json.loads(raw_text)
                post.ai_assist = parsed_json
                await db.commit()
            except Exception as e:
                print(f"Ollama assist failed: {e}")

async def auto_check(db: AsyncSession, entity_type: str, entity_id: int, content: str):
    if entity_type == "comment":
        from .config import ACTIVE_MODEL
        if ACTIVE_MODEL == "off":
            return
            
        # Run ML-based moderation for comments
        is_toxic, confidence = ml_mod(content)

        if confidence >= CONFIDENCE_THRESHOLD:
            if is_toxic:
                # Auto-remove: set comment status to banned
                result = await db.execute(
                    select(models.Comment).where(models.Comment.id == entity_id)
                )
                comment_obj = result.scalar_one_or_none()
                if comment_obj:
                    comment_obj.status = "banned"
                log = models.AdminLog(
                    action_type="automod_remove",
                    entity_type=entity_type,
                    entity_id=entity_id,
                    moderator_id=None,
                    category="AutoMod",
                    details=f"Content automatically removed by AutoMod (confidence: {confidence:.2%})."
                )
                db.add(log)
            else:
                # Auto-resolve: content is fine, no action needed
                log = models.AdminLog(
                    action_type="automod_resolve",
                    entity_type=entity_type,
                    entity_id=entity_id,
                    moderator_id=None,
                    category="AutoMod",
                    details=f"Content automatically resolved by AutoMod (confidence: {confidence:.2%})."
                )
                db.add(log)
        else:
            # Low confidence: flag for manual review
            report = models.Report(
                entity_type=entity_type,
                entity_id=entity_id,
                reason="AutoMod Flag",
                context=f"Flagged for manual review (confidence: {confidence:.2%}, toxic: {is_toxic}).",
                status="pending"
            )
            db.add(report)
            log = models.AdminLog(
                action_type="automod_flag",
                entity_type=entity_type,
                entity_id=entity_id,
                moderator_id=None,
                category="AutoMod",
                details=f"Content flagged for manual review by AutoMod (confidence: {confidence:.2%})."
            )
            db.add(log)
    else:
        # Posts: new posts are placed in pending status for manual review (Approval Queue)
        pass # No need for explicit report as pending posts appear in the approval queue natively
    await db.commit()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/categories")
async def get_categories():
    return CATEGORIES

@app.post("/posts", response_model=schemas.Post)
async def create_post(
    post: schemas.PostCreate,
    background_tasks: BackgroundTasks,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    # Check if user exists (replica)
    result = await db.execute(select(models.User).where(models.User.id == current_user.user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="User not found. Ensure User is created and synced.")

    db_post = models.Post(title=post.title, content=post.content, category=post.category, owner_id=current_user.user_id)
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    await auto_check(db, 'post', db_post.id, db_post.content)
    
    background_tasks.add_task(run_ai_assist, db_post.id)
    
    # Eager load likes and owner for the response schema
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments))
        .where(models.Post.id == db_post.id)
    )
    return result.scalar_one_or_none()

@app.get("/posts", response_model=list[schemas.Post])
async def get_posts(
    search: str | None = None, 
    category: str | None = None,
    sort: str | None = "recent",
    current_user: Annotated[auth.TokenData | None, Depends(auth.get_current_user_optional)] = None,
    db: AsyncSession = Depends(database.get_db)
):
    query = select(models.Post).options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments))
    
    # ALWAYS filter out banned posts in the general feed, even for admins.
    query = query.where(models.Post.status == 'active')
    
    if search:
        query = query.where(models.Post.title.ilike(f"%{search}%"))
    if category and category != "all":
        query = query.where(models.Post.category == category)
        
    if sort == "weekly_top":
        one_week_ago = datetime.now() - timedelta(days=7)
        # We fetch all, and sort in python to avoid complex joins right now, or we can just filter by date and sort natively if we use func.count
        query = query.where(models.Post.created_at >= one_week_ago)
        result = await db.execute(query)
        posts = result.scalars().all()
        # Sort by number of likes
        return sorted(posts, key=lambda p: len(p.likes), reverse=True)
    else:
        # Default recent
        query = query.order_by(models.Post.created_at.desc())
        
    result = await db.execute(query)
    return result.scalars().all()

from sqlalchemy.orm import selectinload

@app.get("/comments/{comment_id}", response_model=schemas.Comment)
async def get_comment(
    comment_id: int,
    report_visit: str | None = None,
    current_user: Annotated[auth.TokenData | None, Depends(auth.get_current_user_optional)] = None,
    db: AsyncSession = Depends(database.get_db)
):
    query = select(models.Comment).options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post)).where(models.Comment.id == comment_id)
    is_admin = current_user and current_user.role == 'admin'
    if not (is_admin and report_visit):
        query = query.where(models.Comment.status == 'active')
    result = await db.execute(query)
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    return c

@app.get("/posts/{post_id}", response_model=schemas.Post)
async def get_post(
    post_id: int,
    report_visit: str | None = None,
    current_user: Annotated[auth.TokenData | None, Depends(auth.get_current_user_optional)] = None,
    db: AsyncSession = Depends(database.get_db)
):
    query = select(models.Post).options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments)).where(models.Post.id == post_id)
    
    is_admin = current_user and current_user.role == 'admin'
    if not (is_admin and report_visit):
        query = query.where(models.Post.status == 'active')
    result = await db.execute(query)
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@app.get("/users/{user_id}", response_model=schemas.User)
async def get_user_replica(user_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.posts).selectinload(models.Post.likes),
            selectinload(models.User.posts).selectinload(models.Post.owner),
            selectinload(models.User.posts).selectinload(models.Post.comments),
            selectinload(models.User.comments).selectinload(models.Comment.likes),
            selectinload(models.User.comments).selectinload(models.Comment.owner),
            selectinload(models.User.comments).selectinload(models.Comment.post)
        )
        .where(models.User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User replica not found")
    return user

@app.post("/posts/{post_id}/comments", response_model=schemas.Comment)
async def create_comment(
    post_id: int,
    comment: schemas.CommentCreate,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    # Check if post exists
    result = await db.execute(select(models.Post).where(models.Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    db_comment = models.Comment(content=comment.content, post_id=post_id, owner_id=current_user.user_id)
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)
    await auto_check(db, 'comment', db_comment.id, db_comment.content)
    
    # Needs likes array and owner for schema
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post))
        .where(models.Comment.id == db_comment.id)
    )
    return result.scalar_one_or_none()

@app.get("/posts/{post_id}/comments", response_model=list[schemas.Comment])
async def get_comments(post_id: int, report_visit: str | None = None, current_user: Annotated[auth.TokenData | None, Depends(auth.get_current_user_optional)] = None, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post))
        .where(models.Comment.post_id == post_id)
    )
    comments = list(result.scalars().all())
    
    is_admin = current_user and current_user.role == 'admin'
    
    filtered_comments = []
    for c in comments:
        if c.status == 'active':
            filtered_comments.append(c)
        elif is_admin and report_visit and str(c.id) == report_visit:
            filtered_comments.append(c)
    comments = filtered_comments
    # Sort pinned comments to the top
    comments.sort(key=lambda c: (not c.is_pinned, c.created_at))
    return comments

@app.put("/posts/{post_id}", response_model=schemas.Post)
async def update_post(
    post_id: int,
    post_update: schemas.PostBase,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments))
        .where(models.Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.owner_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    post.title = post_update.title
    post.content = post_update.content
    post.category = post_update.category
    post.is_edited = True

    await db.commit()
    
    # Re-fetch with all options to satisfy the response schema
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments))
        .where(models.Post.id == post_id)
    )
    return result.scalar_one_or_none()

@app.put("/comments/{comment_id}", response_model=schemas.Comment)
async def update_comment(
    comment_id: int,
    comment_update: schemas.CommentBase,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post))
        .where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.owner_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    # Run ML-based moderation check on edit
    is_toxic, confidence = ml_mod(comment_update.content)
    if is_toxic and confidence >= CONFIDENCE_THRESHOLD:
        raise HTTPException(status_code=400, detail="toxic_edit")

    comment.content = comment_update.content
    comment.is_edited = True

    await db.commit()
    
    # Re-fetch with all options to satisfy the response schema
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post))
        .where(models.Comment.id == comment_id)
    )
    return result.scalar_one_or_none()

@app.post("/comments/{comment_id}/pin", response_model=schemas.Comment)
async def pin_comment(
    comment_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post))
        .where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Verify if user is the POST owner
    post_result = await db.execute(select(models.Post).where(models.Post.id == comment.post_id))
    post = post_result.scalar_one_or_none()
    
    if not post or (post.owner_id != current_user.user_id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Only the post owner or admin can pin comments")

    if not comment.is_pinned:
        # Unpin any currently pinned comment
        await db.execute(
            models.Comment.__table__.update()
            .where(models.Comment.post_id == comment.post_id)
            .values(is_pinned=False)
        )
    
    comment.is_pinned = not comment.is_pinned

    await db.commit()
    
    # Re-fetch with all options to satisfy the response schema
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner), selectinload(models.Comment.post))
        .where(models.Comment.id == comment_id)
    )
    return result.scalar_one_or_none()

@app.post("/posts/{post_id}/like")
async def like_post(
    post_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    # Check if post exists
    result = await db.execute(select(models.Post).where(models.Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check if already liked
    result = await db.execute(
        select(models.Like).where(
            models.Like.post_id == post_id,
            models.Like.owner_id == current_user.user_id
        )
    )
    existing_like = result.scalar_one_or_none()

    if existing_like:
        return {"message": "Post already liked"}
    else:
        new_like = models.Like(post_id=post_id, owner_id=current_user.user_id)
        db.add(new_like)
        await db.commit()
        return {"message": "Post liked"}

@app.delete("/posts/{post_id}/like")
async def unlike_post(
    post_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Like).where(
            models.Like.post_id == post_id,
            models.Like.owner_id == current_user.user_id
        )
    )
    existing_like = result.scalar_one_or_none()
    
    if existing_like:
        await db.delete(existing_like)
        await db.commit()
        return {"message": "Post unliked"}
    return {"message": "Like not found"}

@app.post("/comments/{comment_id}/like")
async def like_comment(
    comment_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    # Check if comment exists
    result = await db.execute(select(models.Comment).where(models.Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check if already liked
    result = await db.execute(
        select(models.Like).where(
            models.Like.comment_id == comment_id,
            models.Like.owner_id == current_user.user_id
        )
    )
    existing_like = result.scalar_one_or_none()

    if existing_like:
        return {"message": "Comment already liked"}
    else:
        new_like = models.Like(comment_id=comment_id, owner_id=current_user.user_id)
        db.add(new_like)
        await db.commit()
        return {"message": "Comment liked"}

@app.delete("/comments/{comment_id}/like")
async def unlike_comment(
    comment_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Like).where(
            models.Like.comment_id == comment_id,
            models.Like.owner_id == current_user.user_id
        )
    )
    existing_like = result.scalar_one_or_none()

    if existing_like:
        await db.delete(existing_like)
        await db.commit()
        return {"message": "Comment unliked"}
    return {"message": "Like not found"}


@app.delete("/posts/{post_id}", status_code=204)
async def admin_delete_post(
    post_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.Post).where(models.Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post.status = "banned"
    log = models.AdminLog(
        action_type="ban",
        entity_type="post",
        entity_id=post_id,
        moderator_id=current_user.user_id,
        category="Moderation",
        details=f"Post banned by admin {current_user.username}"
    )
    db.add(log)
    await db.commit()
    return Response(status_code=204)


@app.delete("/comments/{comment_id}", status_code=204)
async def admin_delete_comment(
    comment_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.Comment).where(models.Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.status = "banned"
    log = models.AdminLog(
        action_type="ban",
        entity_type="comment",
        entity_id=comment_id,
        moderator_id=current_user.user_id,
        category="Moderation",
        details=f"Comment banned by admin {current_user.username}"
    )
    db.add(log)
    await db.commit()
    return Response(status_code=204)

@app.get("/admin/stats")
async def get_admin_stats(
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    total_posts = (await db.execute(select(func.count(models.Post.id)))).scalar() or 0
    total_comments = (await db.execute(select(func.count(models.Comment.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(models.User.id)))).scalar() or 0

    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    posts_today = (await db.execute(
        select(func.count(models.Post.id)).where(models.Post.created_at >= twenty_four_hours_ago)
    )).scalar() or 0

    top_category_result = await db.execute(
        select(models.Post.category, func.count(models.Post.id).label("cnt"))
        .group_by(models.Post.category)
        .order_by(func.count(models.Post.id).desc())
        .limit(1)
    )
    top_row = top_category_result.first()
    top_category = top_row[0] if top_row else "N/A"

    return {
        "total_posts": total_posts,
        "total_comments": total_comments,
        "total_users": total_users,
        "posts_today": posts_today,
        "top_category": top_category
    }


@app.get("/admin/reports", response_model=list[schemas.Report])
async def get_reports(
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.Report).where(models.Report.status == "pending").order_by(models.Report.created_at.desc()))
    return result.scalars().all()

@app.post("/admin/reports/{report_id}/resolve", response_model=schemas.Report)
async def resolve_report(
    report_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    quiet: bool = False,
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.Report).where(models.Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "resolved"
    if not quiet:
        log = models.AdminLog(
            action_type="resolve_report",
            entity_type=report.entity_type,
            entity_id=report.entity_id,
            moderator_id=current_user.user_id,
            category="Moderation",
            details=f"Report {report_id} resolved by admin {current_user.username}"
        )
        db.add(log)
    await db.commit()
    await db.refresh(report)
    return report

@app.get("/admin/pending_posts", response_model=list[schemas.Post])
async def get_pending_posts(
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    query = (
        select(models.Post)
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments))
        .where(models.Post.status == 'pending')
        .order_by(models.Post.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@app.post("/admin/posts/{post_id}/approve", response_model=schemas.Post)
async def approve_post(
    post_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner), selectinload(models.Post.comments))
        .where(models.Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post.status = "active"
    log = models.AdminLog(
        action_type="approve_post",
        entity_type="post",
        entity_id=post_id,
        moderator_id=current_user.user_id,
        category="Moderation",
        details=f"Post approved by admin {current_user.username}"
    )
    db.add(log)
    await db.commit()
    await db.refresh(post)
    return post

@app.get("/admin/automod/config", response_model=schemas.AutoModConfig)
async def get_automod_config(
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    res_cfg = await db.execute(select(models.AutoModConfig).where(models.AutoModConfig.id == 1))
    am_cfg = res_cfg.scalar_one_or_none()
    if not am_cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    return am_cfg

@app.put("/admin/automod/config", response_model=schemas.AutoModConfig)
async def update_automod_config(
    config_update: schemas.AutoModConfigUpdate,
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    res_cfg = await db.execute(select(models.AutoModConfig).where(models.AutoModConfig.id == 1))
    am_cfg = res_cfg.scalar_one_or_none()
    if not am_cfg:
        raise HTTPException(status_code=404, detail="Config not found")
        
    am_cfg.llm_prompt = config_update.llm_prompt
    am_cfg.auto_comments = config_update.auto_comments
    am_cfg.llm_model = config_update.llm_model
    
    await db.commit()
    await db.refresh(am_cfg)
    return am_cfg

@app.get("/admin/automod/models")
async def get_automod_models(
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)]
):
    try:
        from .config import OLLAMA_URL
        base_url = OLLAMA_URL.rsplit('/', 1)[0]
        tags_url = f"{base_url}/tags"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(tags_url)
            response.raise_for_status()
            data = response.json()
            return {"models": [m["name"] for m in data.get("models", [])]}
    except Exception as e:
        print(f"Failed to fetch Ollama models: {e}")
        return {"models": []}


@app.post("/admin/posts/{post_id}/deny", status_code=204)
async def deny_post(
    post_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.Post).where(models.Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post.status = "removed"
    log = models.AdminLog(
        action_type="deny_post",
        entity_type="post",
        entity_id=post_id,
        moderator_id=current_user.user_id,
        category="Moderation",
        details=f"Post denied and removed by admin {current_user.username}"
    )
    db.add(log)
    await db.commit()
    return Response(status_code=204)

@app.get("/admin/logs", response_model=list[schemas.AdminLog])
async def get_logs(
    current_user: Annotated[auth.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.AdminLog)
        .options(selectinload(models.AdminLog.moderator))
        .order_by(models.AdminLog.created_at.desc())
    )
    return result.scalars().all()

@app.post("/reports", response_model=schemas.Report)
async def create_user_report(
    report: schemas.ReportCreate,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    db_report = models.Report(
        entity_type=report.entity_type,
        entity_id=report.entity_id,
        reason=report.reason,
        context=report.context,
        status="pending"
    )
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)
    return db_report
