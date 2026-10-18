import csv
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.student import Student
from app.services.gemini_service import gemini_service
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentDetailResponse,
    StudentScoreDetail,
    QuizQuestion,
    BulkScoreSubmissionPayload,
    AssessmentAIAnalysisResponse,
)

router = APIRouter()


class CSVImportPayload(BaseModel):
    """Payload for importing student marks via CSV string."""
    csv_text: str


def _parse_quiz_questions(raw_quiz_data: Optional[str]) -> List[QuizQuestion]:
    """Safely deserializes JSON quiz_data into List[QuizQuestion]."""
    if not raw_quiz_data:
        return []
    try:
        items = json.loads(raw_quiz_data)
        if isinstance(items, list):
            parsed = []
            for item in items:
                if isinstance(item, dict):
                    parsed.append(QuizQuestion(**item))
            return parsed
    except Exception:
        pass
    return []


@router.get(
    "",
    response_model=List[AssessmentResponse],
    status_code=status.HTTP_200_OK,
    summary="List Assessments",
    description="Returns assessments and quizzes belonging to the authenticated faculty member.",
)
def list_assessments(
    class_id: Optional[int] = None,
    assessment_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[AssessmentResponse]:
    query = db.query(Assessment).filter(Assessment.teacher_id == current_user.id)
    if class_id is not None:
        query = query.filter(Assessment.class_id == class_id)
    if assessment_type is not None:
        query = query.filter(Assessment.assessment_type == assessment_type)

    assessments = query.order_by(Assessment.created_at.desc()).all()
    results: List[AssessmentResponse] = []

    for asm in assessments:
        scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.assessment_id == asm.id).all()
        if scores:
            avg_score = sum(s.score for s in scores) / len(scores)
            avg_pct = sum(s.percentage or ((s.score / asm.max_score) * 100.0) for s in scores) / len(scores)
        else:
            avg_score = None
            avg_pct = None

        has_quiz = bool(asm.quiz_data and len(asm.quiz_data) > 5)

        results.append(
            AssessmentResponse(
                id=asm.id,
                title=asm.title,
                subject=asm.subject,
                grade_level=asm.grade_level,
                semester=asm.semester or asm.grade_level,
                course_code=asm.course_code,
                assessment_type=asm.assessment_type or "cie_exam",
                status=asm.status or "graded",
                description=asm.description,
                duration_minutes=asm.duration_minutes,
                passing_score=asm.passing_score or 40.0,
                class_id=asm.class_id,
                max_score=asm.max_score,
                total_questions=asm.total_questions or 0,
                has_quiz_data=has_quiz,
                assessment_date=asm.assessment_date,
                average_score=round(avg_score, 1) if avg_score is not None else None,
                average_percentage=round(avg_pct, 1) if avg_pct is not None else None,
                student_count=len(scores),
                created_at=asm.created_at,
            )
        )
    return results


@router.post(
    "",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Assessment or Quiz",
    description="Creates a new college assessment, CIE test, or quiz authored by the faculty member.",
)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentResponse:
    assessment_date = payload.assessment_date or datetime.now(timezone.utc)
    quiz_data_str = None
    total_q = payload.total_questions

    if payload.quiz_questions:
        total_q = len(payload.quiz_questions)
        quiz_data_str = json.dumps([q.model_dump() for q in payload.quiz_questions])
        # Auto-compute max score if sum of question marks > 0
        sum_marks = sum(q.marks for q in payload.quiz_questions)
        if sum_marks > 0 and payload.max_score == 100.0 and payload.assessment_type == "quiz":
            payload.max_score = sum_marks

    semester_val = payload.semester or payload.grade_level or "Semester 5"

    new_assessment = Assessment(
        teacher_id=current_user.id,
        class_id=payload.class_id,
        title=payload.title,
        subject=payload.subject,
        grade_level=semester_val,
        semester=semester_val,
        course_code=payload.course_code,
        assessment_type=payload.assessment_type,
        status=payload.status,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        passing_score=payload.passing_score,
        max_score=payload.max_score,
        total_questions=total_q,
        quiz_data=quiz_data_str,
        assessment_date=assessment_date,
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return AssessmentResponse(
        id=new_assessment.id,
        title=new_assessment.title,
        subject=new_assessment.subject,
        grade_level=new_assessment.grade_level,
        semester=new_assessment.semester,
        course_code=new_assessment.course_code,
        assessment_type=new_assessment.assessment_type,
        status=new_assessment.status,
        description=new_assessment.description,
        duration_minutes=new_assessment.duration_minutes,
        passing_score=new_assessment.passing_score,
        class_id=new_assessment.class_id,
        max_score=new_assessment.max_score,
        total_questions=new_assessment.total_questions,
        has_quiz_data=bool(new_assessment.quiz_data),
        assessment_date=new_assessment.assessment_date,
        average_score=None,
        average_percentage=None,
        student_count=0,
        created_at=new_assessment.created_at,
    )


@router.get(
    "/{assessment_id}",
    response_model=AssessmentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Assessment Details",
    description="Returns detailed assessment metadata, authored quiz questions, and student score distribution.",
)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentDetailResponse:
    asm = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id)
        .first()
    )
    if not asm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found.",
        )

    score_records = (
        db.query(StudentAssessmentScore, Student)
        .join(Student, StudentAssessmentScore.student_id == Student.id)
        .filter(StudentAssessmentScore.assessment_id == asm.id)
        .all()
    )

    scores_list: List[StudentScoreDetail] = []
    total_scores = len(score_records)
    avg_score = None
    avg_pct = None

    if total_scores > 0:
        sum_scores = sum(sc.score for sc, _ in score_records)
        sum_pct = sum(sc.percentage or ((sc.score / asm.max_score) * 100.0) for sc, _ in score_records)
        avg_score = round(sum_scores / total_scores, 1)
        avg_pct = round(sum_pct / total_scores, 1)

        for sc, st in score_records:
            pct = sc.percentage if sc.percentage is not None else (sc.score / asm.max_score) * 100.0
            scores_list.append(
                StudentScoreDetail(
                    student_id=st.id,
                    student_id_code=st.student_id_code,
                    student_name=st.full_name,
                    score=sc.score,
                    percentage=round(pct, 1),
                    feedback=sc.feedback,
                    question_scores=sc.question_scores,
                )
            )

    quiz_questions = _parse_quiz_questions(asm.quiz_data)

    return AssessmentDetailResponse(
        id=asm.id,
        title=asm.title,
        subject=asm.subject,
        grade_level=asm.grade_level,
        semester=asm.semester or asm.grade_level,
        course_code=asm.course_code,
        assessment_type=asm.assessment_type or "cie_exam",
        status=asm.status or "graded",
        description=asm.description,
        duration_minutes=asm.duration_minutes,
        passing_score=asm.passing_score or 40.0,
        class_id=asm.class_id,
        max_score=asm.max_score,
        total_questions=asm.total_questions or len(quiz_questions),
        has_quiz_data=bool(quiz_questions),
        assessment_date=asm.assessment_date,
        average_score=avg_score,
        average_percentage=avg_pct,
        student_count=total_scores,
        created_at=asm.created_at,
        quiz_questions=quiz_questions,
        scores=scores_list,
    )


@router.put(
    "/{assessment_id}",
    response_model=AssessmentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Assessment",
    description="Updates metadata, authored questions, or status of an existing assessment.",
)
def update_assessment(
    assessment_id: int,
    payload: AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentDetailResponse:
    asm = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id)
        .first()
    )
    if not asm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found.",
        )

    if payload.title is not None:
        asm.title = payload.title
    if payload.subject is not None:
        asm.subject = payload.subject
    if payload.grade_level is not None:
        asm.grade_level = payload.grade_level
    if payload.semester is not None:
        asm.semester = payload.semester
    if payload.course_code is not None:
        asm.course_code = payload.course_code
    if payload.class_id is not None:
        asm.class_id = payload.class_id
    if payload.assessment_type is not None:
        asm.assessment_type = payload.assessment_type
    if payload.status is not None:
        asm.status = payload.status
    if payload.description is not None:
        asm.description = payload.description
    if payload.duration_minutes is not None:
        asm.duration_minutes = payload.duration_minutes
    if payload.passing_score is not None:
        asm.passing_score = payload.passing_score
    if payload.max_score is not None:
        asm.max_score = payload.max_score
    if payload.assessment_date is not None:
        asm.assessment_date = payload.assessment_date

    if payload.quiz_questions is not None:
        asm.total_questions = len(payload.quiz_questions)
        asm.quiz_data = json.dumps([q.model_dump() for q in payload.quiz_questions])

    db.commit()
    db.refresh(asm)
    return get_assessment(assessment_id=asm.id, db=db, current_user=current_user)


@router.delete(
    "/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Assessment",
    description="Deletes an assessment and its associated student scores.",
)
def delete_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asm = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id)
        .first()
    )
    if not asm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found.",
        )

    # Delete scores first
    db.query(StudentAssessmentScore).filter(StudentAssessmentScore.assessment_id == asm.id).delete()
    db.delete(asm)
    db.commit()
    return None


@router.post(
    "/{assessment_id}/scores",
    response_model=AssessmentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Record Assessment Marks",
    description="Batch records student marks for this assessment and transitions status to graded.",
)
def record_assessment_scores(
    assessment_id: int,
    payload: BulkScoreSubmissionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentDetailResponse:
    asm = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id)
        .first()
    )
    if not asm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found.",
        )

    for entry in payload.scores:
        # Verify student exists and belongs to this teacher
        student = db.query(Student).filter(Student.id == entry.student_id, Student.teacher_id == current_user.id).first()
        if not student:
            continue

        pct = round((entry.score / (asm.max_score or 100.0)) * 100.0, 1)

        existing_score = (
            db.query(StudentAssessmentScore)
            .filter(
                StudentAssessmentScore.assessment_id == asm.id,
                StudentAssessmentScore.student_id == student.id,
            )
            .first()
        )

        if existing_score:
            existing_score.score = entry.score
            existing_score.percentage = pct
            existing_score.feedback = entry.feedback
            if entry.question_scores:
                existing_score.question_scores = entry.question_scores
        else:
            new_score = StudentAssessmentScore(
                assessment_id=asm.id,
                student_id=student.id,
                score=entry.score,
                percentage=pct,
                feedback=entry.feedback,
                question_scores=entry.question_scores,
            )
            db.add(new_score)

    asm.status = "graded"
    db.commit()
    db.refresh(asm)

    return get_assessment(assessment_id=asm.id, db=db, current_user=current_user)


@router.post(
    "/{assessment_id}/import-scores",
    response_model=AssessmentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Import Marks via CSV",
    description="Imports student marks via CSV with USN/student_id_code, score, and optional feedback.",
)
def import_assessment_scores_csv(
    assessment_id: int,
    payload: CSVImportPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentDetailResponse:
    asm = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id)
        .first()
    )
    if not asm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found.",
        )

    # Load all faculty's students indexed by student_id_code and by ID
    students_by_code = {
        s.student_id_code.strip().upper(): s
        for s in db.query(Student).filter(
            (Student.teacher_id == current_user.id) | (Student.teacher_id == None)
        ).all()
    }

    reader = csv.reader(io.StringIO(payload.csv_text.strip()))
    imported_count = 0

    for raw_row in reader:
        if not raw_row or len(raw_row) < 2:
            continue
        row = [c.strip() for c in raw_row]
        usn_or_id = row[0].upper()
        # Skip header rows
        if usn_or_id in ("USN", "STUDENT_ID", "STUDENT_ID_CODE", "ROLL_NO", "ID"):
            continue

        target_student = students_by_code.get(usn_or_id)
        if not target_student and usn_or_id.isdigit():
            # Lookup by integer ID
            target_student = db.query(Student).filter(
                Student.id == int(usn_or_id),
                (Student.teacher_id == current_user.id) | (Student.teacher_id == None),
            ).first()

        if not target_student:
            continue

        if target_student.teacher_id is None:
            target_student.teacher_id = current_user.id

        try:
            score_val = float(row[1].strip())
        except ValueError:
            continue

        feedback_val = row[2].strip() if len(row) > 2 else None
        pct = round((score_val / (asm.max_score or 100.0)) * 100.0, 1)

        existing = (
            db.query(StudentAssessmentScore)
            .filter(
                StudentAssessmentScore.assessment_id == asm.id,
                StudentAssessmentScore.student_id == target_student.id,
            )
            .first()
        )
        if existing:
            existing.score = score_val
            existing.percentage = pct
            existing.feedback = feedback_val
        else:
            db.add(
                StudentAssessmentScore(
                    assessment_id=asm.id,
                    student_id=target_student.id,
                    score=score_val,
                    percentage=pct,
                    feedback=feedback_val,
                )
            )
        imported_count += 1

    if imported_count > 0:
        asm.status = "graded"
        db.commit()
        db.refresh(asm)

    return get_assessment(assessment_id=asm.id, db=db, current_user=current_user)


@router.post(
    "/{assessment_id}/ai-analysis",
    response_model=AssessmentAIAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Assessment AI Diagnostic Analysis",
    description="Runs Gemini AI diagnostic intelligence on class scores and questions to identify bottlenecks.",
)
def analyze_assessment_ai(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentAIAnalysisResponse:
    asm = (
        db.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.teacher_id == current_user.id)
        .first()
    )
    if not asm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment with ID {assessment_id} not found.",
        )

    score_records = (
        db.query(StudentAssessmentScore, Student)
        .join(Student, StudentAssessmentScore.student_id == Student.id)
        .filter(StudentAssessmentScore.assessment_id == asm.id)
        .all()
    )

    scores_dicts = [
        {
            "student_id": st.id,
            "student_id_code": st.student_id_code,
            "score": sc.score,
            "percentage": sc.percentage or ((sc.score / asm.max_score) * 100.0),
            "feedback": sc.feedback,
            "question_scores": sc.question_scores,
        }
        for sc, st in score_records
    ]

    quiz_questions = _parse_quiz_questions(asm.quiz_data)
    questions_dicts = [q.model_dump() for q in quiz_questions]

    result = gemini_service.analyze_assessment_performance(
        assessment_title=asm.title,
        course_code=asm.course_code,
        semester=asm.semester or asm.grade_level,
        subject=asm.subject,
        max_score=asm.max_score,
        student_scores=scores_dicts,
        authored_questions=questions_dicts,
    )

    return AssessmentAIAnalysisResponse(
        assessment_id=asm.id,
        assessment_title=asm.title,
        overall_performance_summary=result.get("overall_performance_summary", "Diagnostic analysis completed."),
        strengths_identified=result.get("strengths_identified", []),
        critical_misconceptions=result.get("critical_misconceptions", []),
        question_difficulty_breakdown=result.get("question_difficulty_breakdown", []),
        recommended_pedagogical_actions=result.get("recommended_pedagogical_actions", []),
        causality_caveat=result.get("causality_caveat", "Assessment results reflect diagnostic indicators."),
        model_used=result.get("model_used", "gemini-3.8-flash"),
    )
