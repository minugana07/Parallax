from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AssessmentCreate(BaseModel):
    """Payload to create a new classroom assessment."""
    title: str = Field(..., min_length=3, max_length=150)
    subject: str = Field(..., min_length=2, max_length=100)
    grade_level: str = Field(..., min_length=1, max_length=50)
    class_id: Optional[int] = None
    max_score: float = Field(default=100.0, gt=0)
    assessment_date: Optional[datetime] = None


class StudentScoreDetail(BaseModel):
    """Individual score entry for an assessment."""
    student_id: int
    student_id_code: str
    student_name: str
    score: float
    percentage: float
    feedback: Optional[str] = None


class AssessmentResponse(BaseModel):
    """Assessment summary item."""
    id: int
    title: str
    subject: str
    grade_level: str
    class_id: Optional[int] = None
    max_score: float
    assessment_date: Optional[datetime] = None
    average_score: Optional[float] = None
    average_percentage: Optional[float] = None
    student_count: int = 0
    created_at: Optional[datetime] = None


class AssessmentDetailResponse(AssessmentResponse):
    """Detailed assessment response including student score breakdown."""
    scores: List[StudentScoreDetail] = []

