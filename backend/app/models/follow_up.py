from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class FollowUpResult(Base):
    """
    Follow-up outcome assessment to evaluate the efficacy of an applied intervention.
    Enables tracking of student recovery and learning trajectory.
    """

    __tablename__ = "follow_up_results"

    id = Column(Integer, primary_key=True, index=True)
    intervention_id = Column(Integer, ForeignKey("interventions.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome_status = Column(String(50), nullable=False)  # resolved, progressing, needs_reinforcement, unchanged
    outcome_score = Column(Float, nullable=True)
    observations = Column(Text, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
