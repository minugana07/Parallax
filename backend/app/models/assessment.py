from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.session import Base


class Assessment(Base):
    """
    Assessment model for college-level tests, lab examinations, and diagnostic evaluations.
    Can optionally be linked to a specific AcademicClass.
    """

    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(150), nullable=False)
    subject = Column(String(100), nullable=False)
    grade_level = Column(String(50), nullable=False, default="Semester 5")
    semester = Column(String(50), nullable=True)  # e.g. "Semester 5"
    course_code = Column(String(50), nullable=True)  # e.g. "22CS52"
    assessment_type = Column(String(50), nullable=False, default="cie_exam")  # cie_exam, quiz, lab_test, assignment, midterm, project
    status = Column(String(50), nullable=False, default="graded")  # draft, scheduled, completed, graded
    description = Column(Text, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    passing_score = Column(Float, nullable=True, default=40.0)
    max_score = Column(Float, nullable=False, default=100.0)
    total_questions = Column(Integer, nullable=False, default=0)
    quiz_data = Column(Text, nullable=True)  # JSON-encoded authored questions, options, answers, and explanations
    assessment_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StudentAssessmentScore(Base):
    """Individual student score for a specific assessment."""

    __tablename__ = "student_assessment_scores"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    percentage = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    question_scores = Column(Text, nullable=True)  # JSON-encoded per-question marks/responses
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
