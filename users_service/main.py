from typing import Annotated
from datetime import timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Response
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordRequestForm
from . import models, schemas, database, producer, auth

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    
    # Auto-create admin user if not exists
    async with database.AsyncSessionLocal() as session:
        result = await session.execute(select(models.User).where(models.User.username == "admin"))
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            hashed_password = auth.get_password_hash("admin")
            admin_user = models.User(
                email="admin@forum.local",
                username="admin",
                hashed_password=hashed_password,
                role="admin"
            )
            session.add(admin_user)
            await session.commit()
            print("Admin user created automatically.")

            # Publish event so posts_service gets the admin user replica
            await session.refresh(admin_user)
            try:
                await producer.publish_event("user_created", {
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "username": admin_user.username,
                    "role": admin_user.role
                })
            except Exception as e:
                print(f"Failed to publish admin user creation: {e}")
        else:
            print("Admin user already exists. Publishing sync event anyway.")
            await session.refresh(admin_user)
            try:
                await producer.publish_event("user_created", {
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "username": admin_user.username,
                    "role": admin_user.role
                })
            except Exception as e:
                print(f"Failed to publish admin user sync: {e}")
    
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/users", response_model=schemas.User)
async def create_user(user: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    # Check if username is already taken
    result = await db.execute(select(models.User).where(models.User.username == user.username))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
        
    # Check if email is already taken
    result_email = await db.execute(select(models.User).where(models.User.email == user.email))
    existing_email = result_email.scalar_one_or_none()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Publish event
    await producer.publish_event("user_created", {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "role": db_user.role
    })
    
    return db_user

from sqlalchemy import or_

@app.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(database.get_db)
):
    # Authenticate user by email or username
    result = await db.execute(
        select(models.User).where(
            or_(
                models.User.email == form_data.username,
                models.User.username == form_data.username
            )
        )
    )
    user = result.scalar_one_or_none()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is banned
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been banned."
        )
        
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "user_id": user.id, "username": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return schemas.Token(access_token=access_token, token_type="bearer")

@app.put("/users/{user_id}", response_model=schemas.User)
async def update_user(user_id: int, user: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    db_user = result.scalar_one_or_none()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.email = user.email
    db_user.username = user.username
    
    await db.commit()
    await db.refresh(db_user)

    # Publish event
    await producer.publish_event("user_updated", {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "role": db_user.role
    })

    return db_user

@app.get("/admin/users", response_model=list[schemas.AdminUser])
async def get_all_users(
    current_user: Annotated[schemas.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.User).order_by(models.User.created_at.desc()))
    return result.scalars().all()

@app.post("/admin/users/{user_id}/ban", response_model=schemas.AdminUser)
async def toggle_ban_user(
    user_id: int,
    current_user: Annotated[schemas.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_banned = not user.is_banned
    await db.commit()
    await db.refresh(user)
    return user

@app.put("/admin/users/{user_id}/role", response_model=schemas.AdminUser)
async def update_user_role(
    user_id: int,
    role_update: schemas.RoleUpdate,
    current_user: Annotated[schemas.TokenData, Depends(auth.require_admin)],
    db: AsyncSession = Depends(database.get_db)
):
    if role_update.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
    
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role_update.role
    await db.commit()
    await db.refresh(user)
    return user
