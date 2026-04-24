import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class ContentStatus(str, enum.Enum):
    active = "active"
    banned = "banned"
    removed = "removed"
    pending = "pending"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) # ID from the upstream Users Service
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(String, default="user", nullable=False)
    profile_meta = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    posts = relationship("Post", back_populates="owner")
    comments = relationship("Comment", back_populates="owner")
    likes = relationship("Like", back_populates="owner")

class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    category = Column(String, nullable=False, default="unknown")
    is_edited = Column(Boolean, nullable=False, default=False)
    status = Column(SQLEnum(ContentStatus, name="content_status"), nullable=False, default=ContentStatus.pending)
    ai_assist = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    is_edited = Column(Boolean, nullable=False, default=False)
    is_pinned = Column(Boolean, nullable=False, default=False)
    status = Column(SQLEnum(ContentStatus, name="content_status"), nullable=False, default=ContentStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    post_id = Column(Integer, ForeignKey("posts.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))

    post = relationship("Post", back_populates="comments")
    owner = relationship("User", back_populates="comments")
    likes = relationship("Like", back_populates="comment", cascade="all, delete-orphan")

    @property
    def post_title(self) -> str | None:
        return self.post.title if self.post else None

class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)

    owner = relationship("User", back_populates="likes")
    post = relationship("Post", back_populates="likes")
    comment = relationship("Comment", back_populates="likes")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False) # 'post' or 'comment'
    entity_id = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    context = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False) # 'pending' or 'resolved'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String, nullable=False) # 'resolve_report', 'ban', 'automod_flag'
    entity_type = Column(String, nullable=True) # 'post', 'comment', 'user'
    entity_id = Column(Integer, nullable=True)
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null if automod
    category = Column(String, nullable=False) # 'Reports', 'AutoMod', 'Moderation'
    details = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    moderator = relationship("User")
