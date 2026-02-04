from pydantic import BaseModel, ConfigDict
from typing import List

class PostBase(BaseModel):
    title: str
    content: str

class PostCreate(PostBase):
    pass

class Post(PostBase):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: str
    full_name: str

class User(UserBase):
    id: int
    posts: List[Post] = []

    model_config = ConfigDict(from_attributes=True)
