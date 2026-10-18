from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class Intervention(Base):
    """
    Teacher intervention record connecting an identified gap with pedagogical action.
    Core pillar of the Parallax Teacher Memory Engine.
    """

    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    learning_gap_id = Column(Integer, ForeignKey("learning_gaps.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    strategy_type = Column(String(100), nullable=False)  # e.g., peer_tutoring, concept_revisit, targeted_worksheet
    description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="proposed")  # proposed, approved, active, completed
    teacher_approved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
