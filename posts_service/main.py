from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
import asyncio
from typing import Annotated
from . import models, schemas, database, consumer, auth

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

    db_post = models.Post(title=post.title, content=post.content, owner_id=current_user.user_id)
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post

@app.get("/posts", response_model=list[schemas.Post])
async def get_posts(db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.Post))
    return result.scalars().all()

from sqlalchemy.orm import selectinload

@app.get("/users/{user_id}", response_model=schemas.User)
async def get_user_replica(user_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(
        select(models.User).options(selectinload(models.User.posts)).where(models.User.id == user_id)
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
    return db_comment

@app.get("/posts/{post_id}/comments", response_model=list[schemas.Comment])
async def get_comments(post_id: int, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.Comment).where(models.Comment.post_id == post_id))
    return result.scalars().all()

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
        await db.delete(existing_like)
        await db.commit()
        return {"message": "Post unliked"}
    else:
        new_like = models.Like(post_id=post_id, owner_id=current_user.user_id)
        db.add(new_like)
        await db.commit()
        return {"message": "Post liked"}

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
        await db.delete(existing_like)
        await db.commit()
        return {"message": "Comment unliked"}
    else:
        new_like = models.Like(comment_id=comment_id, owner_id=current_user.user_id)
        db.add(new_like)
        await db.commit()
        return {"message": "Comment liked"}
