from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class Student(Base):
    """
    Student database model representing enrolled learners.
    Supports both college USN identifiers (e.g. 1RV23CS001) and school codes.
    """

    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    student_id_code = Column(String(50), index=True, nullable=False)  # USN / Roll number
    full_name = Column(String(100), nullable=False)
    grade_level = Column(String(50), nullable=False, default="Semester 5")  # Preserves backward compatibility
    section = Column(String(20), nullable=True, default="A")
    department = Column(String(100), nullable=True)  # e.g. "Computer Science & Engineering"
    semester = Column(String(50), nullable=True)  # e.g. "Semester 5"
    email = Column(String(120), nullable=True)  # Institutional email e.g. "student@rvce.edu.in"
    is_archived = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
