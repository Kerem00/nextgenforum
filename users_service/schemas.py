from pydantic import BaseModel, ConfigDict

from datetime import datetime

class UserBase(BaseModel):
    email: str
    username: str
    created_at: datetime

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
