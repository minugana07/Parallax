from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.student import Student
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentResponse,
    AssessmentDetailResponse,
    StudentScoreDetail,
)

router = APIRouter()


@router.get(
    "",
    response_model=List[AssessmentResponse],
    status_code=status.HTTP_200_OK,
    summary="List Assessments",
    description="Returns classroom assessments belonging to the authenticated teacher.",
)
def list_assessments(
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[AssessmentResponse]:
    query = db.query(Assessment).filter(Assessment.teacher_id == current_user.id)
    if class_id is not None:
        query = query.filter(Assessment.class_id == class_id)

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

        results.append(
            AssessmentResponse(
                id=asm.id,
                title=asm.title,
                subject=asm.subject,
                grade_level=asm.grade_level,
                class_id=asm.class_id,
                max_score=asm.max_score,
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
    summary="Create Assessment",
    description="Creates a new classroom assessment owned by the authenticated teacher.",
)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentResponse:
    assessment_date = payload.assessment_date or datetime.now(timezone.utc)
    new_assessment = Assessment(
        teacher_id=current_user.id,
        class_id=payload.class_id,
        title=payload.title,
        subject=payload.subject,
        grade_level=payload.grade_level,
        max_score=payload.max_score,
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
        class_id=new_assessment.class_id,
        max_score=new_assessment.max_score,
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
    description="Returns detailed assessment metadata and student score distribution if owned by authenticated teacher.",
)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentDetailResponse:
    # Strictly scoped by assessment_id and teacher_id to prevent Teacher A inspecting Teacher B's data
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
                )
            )

    return AssessmentDetailResponse(
        id=asm.id,
        title=asm.title,
        subject=asm.subject,
        grade_level=asm.grade_level,
        max_score=asm.max_score,
        assessment_date=asm.assessment_date,
        average_score=avg_score,
        average_percentage=avg_pct,
        student_count=total_scores,
        created_at=asm.created_at,
        scores=scores_list,
    )
