from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class StudentSummary(BaseModel):
    """Student summary representation for class rosters and search."""
    id: int
    student_id_code: str  # USN / Roll number e.g. 1RV23CS001
    full_name: str
    grade_level: str
    section: str
    department: Optional[str] = None
    semester: Optional[str] = None
    email: Optional[str] = None
    average_score: Optional[float] = None
    gaps_count: int = 0
    interventions_count: int = 0
    is_archived: bool = False


class StudentCreate(BaseModel):
    """Schema for adding a student to a class roster."""
    student_id_code: str = Field(..., min_length=2, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = None
    grade_level: Optional[str] = None
    section: Optional[str] = "A"
    department: Optional[str] = None
    semester: Optional[str] = None


class StudentUpdate(BaseModel):
    """Schema for editing student academic details."""
    student_id_code: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[str] = None
    section: Optional[str] = None


class AcademicClassCreate(BaseModel):
    """Schema for creating a new college class/section."""
    institution: str = "RV College of Engineering (RVCE)"
    department: str = Field(..., min_length=2, max_length=100)
    academic_year: str = Field(default="2025-2026")
    semester: str = Field(..., min_length=1, max_length=50)
    course_code: Optional[str] = None
    course_name: str = Field(..., min_length=2, max_length=150)
    section: str = Field(default="A")
    name: Optional[str] = None
    timetable_notes: Optional[str] = None


class AcademicClassUpdate(BaseModel):
    """Schema for editing an existing class."""
    institution: Optional[str] = None
    department: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    section: Optional[str] = None
    name: Optional[str] = None
    timetable_notes: Optional[str] = None
    is_archived: Optional[bool] = None


class ClassSectionResponse(BaseModel):
    """
    Class section summary with comprehension benchmarks.
    Preserves all original fields for backward compatibility while extending with RVCE fields.
    """
    id: Optional[int] = None
    class_name: str
    grade_level: str
    section: str
    subject: str
    institution: str = "RV College of Engineering (RVCE)"
    department: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    timetable_notes: Optional[str] = None
    student_count: int
    average_score_percent: float
    active_gaps_count: int
    assessments_count: int = 0
    is_archived: bool = False
    students: List[StudentSummary] = []


class ClassDetailResponse(BaseModel):
    """Comprehensive detail view for a specific class."""
    id: int
    name: str
    class_name: str
    institution: str
    department: str
    academic_year: str
    semester: str
    grade_level: str
    course_code: Optional[str] = None
    course_name: str
    subject: str
    section: str
    timetable_notes: Optional[str] = None
    student_count: int
    average_score_percent: float
    active_gaps_count: int
    assessments_count: int
    is_archived: bool
    students: List[StudentSummary] = []
    assessments: List[Dict[str, Any]] = []
    learning_gaps: List[Dict[str, Any]] = []
    interventions: List[Dict[str, Any]] = []


class CSVImportRequest(BaseModel):
    """Payload for importing student roster from CSV text."""
    csv_content: str
    has_headers: bool = True


class CSVImportResponse(BaseModel):
    """Structured response detailing student CSV import results."""
    total_rows: int
    imported_count: int
    updated_count: int
    skipped_count: int
    errors: List[str] = []
    imported_students: List[StudentSummary] = []
