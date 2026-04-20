from pydantic import BaseModel, ConfigDict

from datetime import datetime

class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class ProfileMetaUpdate(BaseModel):
    profile_meta: dict | None = None

class User(UserBase):
    id: int
    role: str = "user"
    profile_meta: dict | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int | None = None
    email: str | None = None
    username: str | None = None
    role: str | None = None

class AdminUser(BaseModel):
    id: int
    username: str
    email: str
    role: str = "user"
    is_banned: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RoleUpdate(BaseModel):
    role: str
