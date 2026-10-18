from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class DashboardMetrics(BaseModel):
    """Core summary metrics for teacher intelligence overview."""
    classes_count: int = Field(..., description="Total active class sections taught")
    students_count: int = Field(..., description="Total students tracked across classes")
    assessments_count: int = Field(..., description="Total completed assessments")
    learning_gaps_count: int = Field(..., description="Identified learning areas needing attention")
    active_interventions_count: int = Field(..., description="Teacher interventions currently active or approved")
    resolved_outcomes_count: int = Field(..., description="Gaps verified resolved via follow-up assessment")
    active_semesters_summary: Optional[str] = Field(None, description="Formatted summary of active semesters taught")
    active_semesters: List[str] = Field(default_factory=list, description="List of unique active semesters taught")


class ClassPerformanceItem(BaseModel):
    """Comprehension and score trajectory for an assessment or topic."""
    assessment_id: int
    title: str
    subject: str
    class_name: str
    average_score: float
    benchmark_score: float
    pass_rate: float
    total_students: int
    assessment_date: Optional[str] = None


class LearningGapSummary(BaseModel):
    """Ranked summary of a conceptual topic requiring reteaching."""
    id: int
    topic_id: int
    topic_name: str
    subject: str
    grade_level: str
    severity: str  # critical, moderate, low
    affected_students_count: int
    total_class_students: int
    affected_percentage: float
    evidence: str
    suggested_strategy: str
    status: str  # active, in_progress, resolved


class StudentSupportItem(BaseModel):
    """Non-judgmental record of a student needing targeted conceptual support."""
    student_id: int
    student_id_code: str
    full_name: str
    grade_level: str
    section: str
    subject: str
    topic_name: str
    recent_score_percent: float
    evidence: str
    support_status: str  # pending_intervention, intervention_active, monitoring


class RecentAssessmentItem(BaseModel):
    """Assessment item with completion metrics and score overview."""
    id: int
    title: str
    subject: str
    grade_level: str
    max_score: float
    average_score: float
    average_percent: float
    submission_count: int
    total_enrolled: int
    assessment_date: Optional[str] = None


class MemoryEnginePreviewItem(BaseModel):
    """Compact 4-stage chain demonstrating the Teacher Memory Engine."""
    id: int
    topic_name: str
    subject: str
    student_id_code: str
    student_name: str
    # 1. Assessment Evidence
    assessment_evidence: str
    # 2. Identified Learning Gap
    learning_gap: str
    gap_severity: str
    # 3. Teacher-Approved Intervention
    intervention_title: str
    strategy_type: str
    teacher_approved: bool
    # 4. Follow-Up Outcome
    outcome_status: str  # resolved, progressing, needs_reinforcement, pending
    before_score_percent: float
    after_score_percent: Optional[float] = None
    observation_notes: Optional[str] = None


class TeachingRecommendation(BaseModel):
    """Evidence-oriented recommendation for the next class session."""
    topic_name: str
    subject: str
    grade_level: str
    priority_level: str  # high, medium
    reason_evidence: str
    suggested_action: str
    estimated_time_minutes: int
    source_assessment: str


class DashboardOverviewResponse(BaseModel):
    """Consolidated payload for the Parallax teacher dashboard."""
    metrics: DashboardMetrics
    class_performance: List[ClassPerformanceItem]
    learning_gaps: List[LearningGapSummary]
    students_needing_support: List[StudentSupportItem]
    recent_assessments: List[RecentAssessmentItem]
    memory_engine_preview: List[MemoryEnginePreviewItem]
    teaching_recommendation: TeachingRecommendation
    is_demo_data: bool = True
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
