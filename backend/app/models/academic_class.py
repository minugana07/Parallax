from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class AcademicClass(Base):
    """
    Academic class or course section model supporting college-level education (e.g. RVCE).
    Enables teachers to manage department-specific course sections, rosters, and timetables.
    """

    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution = Column(String(150), nullable=False, default="RV College of Engineering (RVCE)")
    department = Column(String(100), nullable=False)  # e.g. "Computer Science & Engineering"
    academic_year = Column(String(50), nullable=False, default="2025-2026")  # e.g. "2025-2026"
    semester = Column(String(50), nullable=False)  # e.g. "Semester 5"
    course_code = Column(String(50), nullable=True)  # e.g. "22CS52"
    course_name = Column(String(150), nullable=False)  # e.g. "Design & Analysis of Algorithms"
    section = Column(String(50), nullable=False, default="A")  # e.g. "A", "B", "Batch 1"
    name = Column(String(150), nullable=False)  # e.g. "RVCE - CSE Sem 5 Sec A (DAA)"
    timetable_notes = Column(Text, nullable=True)  # e.g. "Tue/Thu 11:15 AM - 12:15 PM @ CS Room 204"
    is_archived = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
