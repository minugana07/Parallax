from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class User(Base):
    """
    Teacher/User account model for authentication and data ownership.
    Enforces normalized unique email addresses and secure password storage.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    institution = Column(String(200), nullable=True, default="RV College of Engineering (RVCE)")
    department = Column(String(200), nullable=True, default="Computer Science & Engineering")
    designation = Column(String(100), nullable=True, default="Assistant Professor")
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserSession(Base):
    """
    Server-managed active sessions stored in SQLite.
    Allows server-side session invalidation on logout and strict lifecycle controls.
    """

    __tablename__ = "user_sessions"

    session_id = Column(String(64), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
