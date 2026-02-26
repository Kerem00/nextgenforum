from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import asyncio
from typing import Annotated
from datetime import datetime, timedelta
from . import models, schemas, database, consumer, auth

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    
    # Start consumer in background
    task = asyncio.create_task(consumer.consume_events())
    
    yield
    
    # Cleanup if needed (task.cancel() etc)

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/posts", response_model=schemas.Post)
async def create_post(
    post: schemas.PostCreate,
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
    
    # Eager load likes and owner for the response schema
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner))
        .where(models.Post.id == db_post.id)
    )
    return result.scalar_one_or_none()

@app.get("/posts", response_model=list[schemas.Post])
async def get_posts(
    search: str | None = None, 
    category: str | None = None,
    sort: str | None = "recent",
    db: AsyncSession = Depends(database.get_db)
):
    query = select(models.Post).options(selectinload(models.Post.likes), selectinload(models.Post.owner))
    
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

@app.get("/users/{user_id}", response_model=schemas.User)
async def get_user_replica(user_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.posts).selectinload(models.Post.likes), 
            selectinload(models.User.comments).selectinload(models.Comment.likes)
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
    
    # Needs likes array and owner for schema
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner))
        .where(models.Comment.id == db_comment.id)
    )
    return result.scalar_one_or_none()

@app.get("/posts/{post_id}/comments", response_model=list[schemas.Comment])
async def get_comments(post_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner))
        .where(models.Comment.post_id == post_id)
    )
    comments = list(result.scalars().all())
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
        .options(selectinload(models.Post.likes), selectinload(models.Post.owner))
        .where(models.Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    post.title = post_update.title
    post.content = post_update.content
    post.category = post_update.category
    post.is_edited = True

    await db.commit()
    await db.refresh(post)
    return post

@app.put("/comments/{comment_id}", response_model=schemas.Comment)
async def update_comment(
    comment_id: int,
    comment_update: schemas.CommentBase,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner))
        .where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.content = comment_update.content
    comment.is_edited = True

    await db.commit()
    await db.refresh(comment)
    return comment

@app.post("/comments/{comment_id}/pin", response_model=schemas.Comment)
async def pin_comment(
    comment_id: int,
    current_user: Annotated[auth.TokenData, Depends(auth.get_current_user)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(
        select(models.Comment)
        .options(selectinload(models.Comment.likes), selectinload(models.Comment.owner))
        .where(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Verify if user is the POST owner
    post_result = await db.execute(select(models.Post).where(models.Post.id == comment.post_id))
    post = post_result.scalar_one_or_none()
    
    if not post or post.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the post owner can pin comments")

    if not comment.is_pinned:
        # Unpin any currently pinned comment
        await db.execute(
            models.Comment.__table__.update()
            .where(models.Comment.post_id == comment.post_id)
            .values(is_pinned=False)
        )
    
    comment.is_pinned = not comment.is_pinned

    await db.commit()
    await db.refresh(comment)
    return comment

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
