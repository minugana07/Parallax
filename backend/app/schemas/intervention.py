from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class InterventionCreate(BaseModel):
    """Payload to record or approve a pedagogical intervention."""
    student_id: int
    topic_id: Optional[int] = None
    learning_gap_id: Optional[int] = None
    title: str = Field(..., min_length=3, max_length=200)
    strategy_type: str = Field(..., description="e.g. visual_area_model, peer_tutoring, phet_simulation")
    description: str = Field(..., min_length=5)
    teacher_approved: bool = Field(default=True)


class FollowUpCreate(BaseModel):
    """Payload to log follow-up results to close the learning loop."""
    intervention_id: int
    outcome_status: str = Field(..., description="resolved, progressing, needs_reinforcement, unchanged")
    outcome_score: Optional[float] = Field(None, ge=0, le=100)
    observations: Optional[str] = None


class InterventionResponse(BaseModel):
    """Intervention record representation."""
    id: int
    student_id: int
    student_name: Optional[str] = None
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    title: str
    strategy_type: str
    description: str
    status: str
    teacher_approved: bool
    created_at: Optional[datetime] = None


class FullMemoryChain(BaseModel):
    """Comprehensive 4-step memory chain for the dedicated Teacher Memory Engine."""
    id: int
    intervention_id: int
    # 1. Assessment Evidence
    assessment_title: str
    assessment_date: Optional[str] = None
    evidence_text: str
    initial_score_percent: float
    # 2. Identified Gap
    gap_id: int
    topic_name: str
    subject: str
    gap_severity: str
    gap_description: str
    student_name: str
    student_id_code: str
    # 3. Teacher Intervention
    intervention_title: str
    strategy_type: str
    intervention_description: str
    teacher_approved: bool
    intervention_date: Optional[str] = None
    # 4. Follow-Up Outcome
    outcome_id: Optional[int] = None
    outcome_status: str  # resolved, progressing, needs_reinforcement, pending
    outcome_score_percent: Optional[float] = None
    observations: Optional[str] = None
    recorded_at: Optional[str] = None
    # Next Pedagogical Move
    recommended_next_step: str
