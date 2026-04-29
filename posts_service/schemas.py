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
    status: str = "active"
    ai_assist: dict | None = None

class PostCreate(BaseModel):
    title: str
    content: str
    category: str = "unknown"

class UserBase(BaseModel):
    email: str
    username: str
    role: str = "user"
    profile_meta: dict | None = None
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
    status: str = "active"
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

class ReportBase(BaseModel):
    entity_type: str
    entity_id: int
    reason: str
    context: str | None = None
    status: str = "pending"

class ReportCreate(BaseModel):
    entity_type: str
    entity_id: int
    reason: str
    context: str | None = None

class Report(ReportBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AdminLogBase(BaseModel):
    action_type: str
    entity_type: str | None = None
    entity_id: int | None = None
    moderator_id: int | None = None
    category: str
    details: str | None = None

class AdminLogModerator(BaseModel):
    id: int
    username: str
    model_config = ConfigDict(from_attributes=True)

class AdminLog(AdminLogBase):
    id: int
    created_at: datetime
    moderator: AdminLogModerator | None = None
    model_config = ConfigDict(from_attributes=True)

class AutoModConfigBase(BaseModel):
    llm_prompt: str
    auto_comments: dict

class AutoModConfigUpdate(AutoModConfigBase):
    pass

class AutoModConfig(AutoModConfigBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

