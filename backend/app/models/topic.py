from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class Topic(Base):
    """Curriculum topic or learning objective."""

    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(100), nullable=False)
    name = Column(String(150), nullable=False)
    grade_level = Column(String(50), nullable=False, default="Semester 5")
    semester = Column(String(50), nullable=True)  # e.g. "Semester 5"
    course_code = Column(String(50), nullable=True)  # e.g. "22CS52"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningGap(Base):
    """Identified cognitive or conceptual gap for a student on a specific topic."""

    __tablename__ = "learning_gaps"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(String(50), nullable=False, default="moderate")  # low, moderate, critical
    evidence = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="active")  # active, in_progress, resolved
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
