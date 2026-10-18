from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class QuizQuestion(BaseModel):
    """Authored question item within a quiz or test."""
    id: str = Field(..., description="Unique question identifier (e.g. q1, q2)")
    question_text: str = Field(..., min_length=5, description="Prompt or problem statement")
    question_type: str = Field(default="mcq", description="mcq, short_answer, or code_snippet")
    options: List[str] = Field(default_factory=list, description="Multiple choice options")
    correct_answer: int = Field(default=0, description="0-indexed position of the correct option")
    marks: float = Field(default=1.0, gt=0, description="Marks allocated to this question")
    explanation: Optional[str] = Field(None, description="Pedagogical explanation of the correct solution")


class AssessmentCreate(BaseModel):
    """Payload to create a new college assessment or quiz."""
    title: str = Field(..., min_length=3, max_length=150)
    subject: str = Field(..., min_length=2, max_length=100)
    grade_level: Optional[str] = Field(default="Semester 5", max_length=50)
    semester: Optional[str] = Field(default="Semester 5", max_length=50)
    course_code: Optional[str] = Field(default=None, max_length=50)
    class_id: Optional[int] = None
    assessment_type: str = Field(default="cie_exam", description="cie_exam, quiz, lab_test, assignment, midterm, project")
    status: str = Field(default="graded", description="draft, scheduled, completed, graded")
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=60, ge=5, le=300)
    passing_score: Optional[float] = Field(default=40.0, ge=0)
    max_score: float = Field(default=100.0, gt=0)
    total_questions: int = Field(default=0, ge=0)
    quiz_questions: Optional[List[QuizQuestion]] = None
    assessment_date: Optional[datetime] = None


class AssessmentUpdate(BaseModel):
    """Payload to update an existing assessment or quiz."""
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    subject: Optional[str] = Field(None, min_length=2, max_length=100)
    grade_level: Optional[str] = None
    semester: Optional[str] = None
    course_code: Optional[str] = None
    class_id: Optional[int] = None
    assessment_type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[float] = None
    max_score: Optional[float] = None
    total_questions: Optional[int] = None
    quiz_questions: Optional[List[QuizQuestion]] = None
    assessment_date: Optional[datetime] = None


class ScoreEntryPayload(BaseModel):
    """Individual score entry when recording student marks."""
    student_id: int
    score: float = Field(..., ge=0)
    feedback: Optional[str] = None
    question_scores: Optional[str] = None


class BulkScoreSubmissionPayload(BaseModel):
    """Batch recording of marks for an assessment."""
    scores: List[ScoreEntryPayload]


class StudentScoreDetail(BaseModel):
    """Individual score entry for an assessment."""
    student_id: int
    student_id_code: str
    student_name: str
    score: float
    percentage: float
    feedback: Optional[str] = None
    question_scores: Optional[str] = None


class AssessmentResponse(BaseModel):
    """Assessment summary item."""
    id: int
    title: str
    subject: str
    grade_level: str
    semester: Optional[str] = None
    course_code: Optional[str] = None
    assessment_type: str = "cie_exam"
    status: str = "graded"
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    passing_score: Optional[float] = 40.0
    class_id: Optional[int] = None
    max_score: float
    total_questions: int = 0
    has_quiz_data: bool = False
    assessment_date: Optional[datetime] = None
    average_score: Optional[float] = None
    average_percentage: Optional[float] = None
    student_count: int = 0
    created_at: Optional[datetime] = None


class AssessmentDetailResponse(AssessmentResponse):
    """Detailed assessment response including quiz questions and student score breakdown."""
    quiz_questions: List[QuizQuestion] = []
    scores: List[StudentScoreDetail] = []


class QuestionDifficultyItem(BaseModel):
    """Diagnostic item analyzing student performance on a specific question."""
    question_id: str
    question_text: str
    difficulty_rating: str  # high, medium, low
    estimated_success_rate: float
    common_pitfall: str


class AssessmentAIAnalysisResponse(BaseModel):
    """AI-powered assessment diagnostic insights."""
    assessment_id: int
    assessment_title: str
    overall_performance_summary: str
    strengths_identified: List[str]
    critical_misconceptions: List[str]
    question_difficulty_breakdown: List[Dict[str, Any]]
    recommended_pedagogical_actions: List[str]
    causality_caveat: str
    model_used: str


class QuizGenerateRequest(BaseModel):
    """Request to generate quiz questions via AI."""
    topic_name: str = Field(..., min_length=2, max_length=150)
    course_code: Optional[str] = None
    semester: Optional[str] = "Semester 5"
    subject: Optional[str] = "Computer Science & Engineering"
    question_count: int = Field(default=5, ge=1, le=10)
    difficulty: Optional[str] = Field(default="intermediate", description="foundational, intermediate, advanced")


class QuizGenerateResponse(BaseModel):
    """Response containing AI-generated quiz questions."""
    topic_name: str
    questions: List[QuizQuestion]
    model_used: str
