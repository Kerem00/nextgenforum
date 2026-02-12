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

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    post_id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)

class LikeBase(BaseModel):
    pass

class LikeCreate(LikeBase):
    pass

class Like(LikeBase):
    id: int
    owner_id: int
    post_id: int | None = None
    comment_id: int | None = None

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: str
    full_name: str

class User(UserBase):
    id: int
    posts: List[Post] = []
    comments: List[Comment] = []

    model_config = ConfigDict(from_attributes=True)
