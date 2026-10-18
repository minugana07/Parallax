from typing import List, Optional
from pydantic import BaseModel, Field


class AIStatusResponse(BaseModel):
    """Safe status report for Gemini configuration."""

    gemini_configured: bool
    default_model: str
    active_fallback: Optional[str] = None


class AIDiagnosticResponse(BaseModel):
    """Diagnostic check result."""

    status: str
    model_used: Optional[str] = None
    latency_ms: Optional[float] = None
    message: str


class GapExplanationRequest(BaseModel):
    """Request to explain an identified learning gap using evidence."""

    gap_id: int = Field(..., description="ID of the learning gap to analyze")


class GapExplanationResponse(BaseModel):
    """Evidence-grounded explanation of a learning gap."""

    gap_id: int
    topic_name: str
    subject: str
    evidence_analysis: str = Field(..., description="What the assessment evidence demonstrates")
    key_skills_needing_attention: List[str] = Field(..., description="Specific skills requiring pedagogical focus")
    unsupported_claims: str = Field(..., description="What the evidence does NOT establish (guards against over-reach)")
    recommended_diagnostic_checks: List[str] = Field(..., description="Follow-up checks to confirm the gap")
    evidence_strength: str = Field(..., description="Evidence reliability rating: strong, moderate, or preliminary")
    model_used: str


class InterventionProposal(BaseModel):
    """Classroom-ready intervention suggestion requiring teacher review and approval."""

    title: str = Field(..., description="Actionable title of the intervention")
    strategy_type: str = Field(..., description="Pedagogical strategy identifier")
    learning_objective: str = Field(..., description="Specific learning goal")
    classroom_activity: str = Field(..., description="Concrete classroom or small-group activity description")
    duration_minutes: int = Field(..., description="Estimated classroom duration in minutes")
    materials_needed: str = Field(..., description="Required materials, worksheets, or digital tools")
    check_understanding: str = Field(..., description="Specific formative check or exit ticket")
    evidence_basis: str = Field(..., description="Reasoning connecting this strategy to the student's evidence")
    limitations: str = Field(..., description="Contextual assumptions or limitations")
    requires_teacher_approval: bool = True


class InterventionRecommendationRequest(BaseModel):
    """Request to generate pedagogical recommendations for a learning gap."""

    gap_id: int = Field(..., description="ID of the learning gap")


class InterventionRecommendationResponse(BaseModel):
    """Collection of proposed interventions for a learning gap."""

    gap_id: int
    topic_name: str
    proposals: List[InterventionProposal]
    disclaimer: str = "These suggestions are generated for teacher review and must be approved before being recorded."
    model_used: str


class TeacherAssistantRequest(BaseModel):
    """Contextual question asked by teacher."""

    question: str = Field(..., min_length=2, max_length=1000)
    context_type: Optional[str] = Field(None, description="'class', 'assessment', 'gap', or 'general'")
    context_id: Optional[int] = Field(None, description="Optional ID corresponding to the context")


class TeacherAssistantResponse(BaseModel):
    """Pedagogical assistant reply."""

    answer: str
    suggested_follow_up_questions: List[str] = []
    context_used: Optional[str] = None
    model_used: str


class MemorySummaryRequest(BaseModel):
    """Request to analyze longitudinal outcomes for an intervention chain."""

    intervention_id: int


class MemorySummaryResponse(BaseModel):
    """Longitudinal evaluation of intervention outcome."""

    intervention_id: int
    observed_changes: str = Field(..., description="Objective description of changes between pre and post evidence")
    evidence_strength: str = Field(..., description="Assessment evidence strength")
    causality_caveat: str = Field(..., description="Explicit disclaimer regarding non-causal confounding factors")
    suggested_next_step: str = Field(..., description="Recommended pedagogical next step for teacher")
    model_used: str
