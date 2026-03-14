from pydantic import BaseModel, ConfigDict, computed_field, Field
from typing import List, Any
from datetime import datetime

class LikeBase(BaseModel):
    pass

class LikeCreate(LikeBase):
    pass

class Like(LikeBase):
    id: int
    owner_id: int
    post_id: int | None = None
    comment_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PostBase(BaseModel):
    title: str
    content: str
    category: str = "unknown"
    is_edited: bool = False

class PostCreate(BaseModel):
    title: str
    content: str
    category: str = "unknown"

class UserBase(BaseModel):
    email: str
    username: str
    created_at: datetime

class Post(PostBase):
    id: int
    owner_id: int
    created_at: datetime
    owner: UserBase
    likes: List[Like] = []
    comments: List[Any] = Field(default=[], exclude=True)

    @computed_field
    def comment_count(self) -> int:
        return len(self.comments)

    model_config = ConfigDict(from_attributes=True)

class CommentBase(BaseModel):
    content: str
    is_edited: bool = False
    is_pinned: bool = False
    post_title: str | None = None

class CommentCreate(BaseModel):
    content: str

class Comment(CommentBase):
    id: int
    post_id: int
    owner_id: int
    created_at: datetime
    owner: UserBase
    likes: List[Like] = []

    model_config = ConfigDict(from_attributes=True)

class User(UserBase):
    id: int
    posts: List[Post] = []
    comments: List[Comment] = []

    model_config = ConfigDict(from_attributes=True)
