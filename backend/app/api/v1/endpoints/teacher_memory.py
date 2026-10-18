from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.intervention import Intervention
from app.models.follow_up import FollowUpResult
from app.models.student import Student
from app.models.topic import Topic, LearningGap
from app.models.assessment import StudentAssessmentScore, Assessment
from app.schemas.intervention import (
    FullMemoryChain,
    InterventionCreate,
    InterventionResponse,
    FollowUpCreate,
)

router = APIRouter()


@router.get(
    "",
    response_model=List[FullMemoryChain],
    status_code=status.HTTP_200_OK,
    summary="List Teacher Memory Chains",
    description="Returns the full longitudinal chains connecting assessment evidence, gaps, teacher interventions, and follow-up outcomes scoped to authenticated teacher.",
)
def list_memory_chains(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[FullMemoryChain]:
    interventions = (
        db.query(Intervention, Student, Topic, LearningGap)
        .join(Student, Intervention.student_id == Student.id)
        .outerjoin(Topic, Intervention.topic_id == Topic.id)
        .outerjoin(LearningGap, Intervention.learning_gap_id == LearningGap.id)
        .filter(Intervention.teacher_id == current_user.id)
        .order_by(Intervention.created_at.desc())
        .all()
    )

    chains: List[FullMemoryChain] = []
    for interv, student, topic, gap in interventions:
        follow_up = db.query(FollowUpResult).filter(FollowUpResult.intervention_id == interv.id).first()

        recent_score = (
            db.query(StudentAssessmentScore)
            .filter(StudentAssessmentScore.student_id == student.id)
            .first()
        )
        before_pct = recent_score.percentage if recent_score and recent_score.percentage is not None else 42.0

        # Find linked assessment
        asm = None
        if recent_score:
            asm = db.query(Assessment).filter(Assessment.id == recent_score.assessment_id).first()

        asm_title = asm.title if asm else "Classroom Diagnostic Assessment"
        asm_date = asm.assessment_date.strftime("%d %b %Y") if asm and asm.assessment_date else "Recently"

        next_step = (
            "Advance to polynomial applications; monitor on cumulative review."
            if follow_up and follow_up.outcome_status == "resolved"
            else "Pair with peer tutor for 10-minute check-in; conduct formative exit slip."
            if follow_up and follow_up.outcome_status == "progressing"
            else "Conduct hands-on multimeter laboratory session during double period."
            if follow_up and follow_up.outcome_status == "pending"
            else "Review prerequisite concepts."
        )

        chains.append(
            FullMemoryChain(
                id=interv.id,
                intervention_id=interv.id,
                assessment_title=asm_title,
                assessment_date=asm_date,
                evidence_text=gap.evidence if gap and gap.evidence else "Diagnostic score below competency threshold.",
                initial_score_percent=round(before_pct, 1),
                gap_id=gap.id if gap else 0,
                topic_name=topic.name if topic else "Curriculum Objective",
                subject=topic.subject if topic else "General",
                gap_severity=gap.severity if gap else "moderate",
                gap_description=(
                    f"Student struggled with core mechanics in {topic.name}."
                    if topic
                    else "Identified conceptual gap."
                ),
                student_name=student.full_name,
                student_id_code=student.student_id_code,
                intervention_title=interv.title,
                strategy_type=interv.strategy_type,
                intervention_description=interv.description,
                teacher_approved=interv.teacher_approved,
                intervention_date=interv.created_at.strftime("%d %b %Y") if interv.created_at else "Recently",
                outcome_id=follow_up.id if follow_up else None,
                outcome_status=follow_up.outcome_status if follow_up else "pending",
                outcome_score_percent=follow_up.outcome_score if follow_up else None,
                observations=follow_up.observations if follow_up else "Awaiting follow-up re-assessment check.",
                recorded_at=follow_up.recorded_at.strftime("%d %b %Y") if follow_up and follow_up.recorded_at else None,
                recommended_next_step=next_step,
            )
        )

    return chains


@router.post(
    "/interventions",
    response_model=InterventionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Teacher Intervention",
    description="Records a new teacher-approved intervention to connect a learning gap with pedagogical action.",
)
def record_intervention(
    payload: InterventionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterventionResponse:
    # Ensure student is owned by authenticated teacher
    student = (
        db.query(Student)
        .filter(Student.id == payload.student_id, Student.teacher_id == current_user.id)
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID {payload.student_id} not found in your roster.",
        )

    # If gap is provided, verify ownership
    if payload.learning_gap_id:
        gap = (
            db.query(LearningGap)
            .filter(LearningGap.id == payload.learning_gap_id, LearningGap.teacher_id == current_user.id)
            .first()
        )
        if not gap:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Learning gap with ID {payload.learning_gap_id} not found in your records.",
            )

    new_interv = Intervention(
        teacher_id=current_user.id,
        student_id=payload.student_id,
        topic_id=payload.topic_id,
        learning_gap_id=payload.learning_gap_id,
        title=payload.title,
        strategy_type=payload.strategy_type,
        description=payload.description,
        status="active",
        teacher_approved=payload.teacher_approved,
    )
    db.add(new_interv)
    db.commit()
    db.refresh(new_interv)

    # Automatically create pending follow-up result
    pending_fu = FollowUpResult(
        intervention_id=new_interv.id,
        outcome_status="pending",
        observations="Intervention recorded. Awaiting follow-up outcome evaluation.",
    )
    db.add(pending_fu)
    db.commit()

    return InterventionResponse(
        id=new_interv.id,
        student_id=new_interv.student_id,
        student_name=student.full_name,
        topic_id=new_interv.topic_id,
        title=new_interv.title,
        strategy_type=new_interv.strategy_type,
        description=new_interv.description,
        status=new_interv.status,
        teacher_approved=new_interv.teacher_approved,
        created_at=new_interv.created_at,
    )


@router.post(
    "/follow-ups",
    status_code=status.HTTP_200_OK,
    summary="Log Follow-Up Result",
    description="Updates or logs follow-up outcome results for an existing intervention owned by the teacher.",
)
def log_follow_up(
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interv = (
        db.query(Intervention)
        .filter(Intervention.id == payload.intervention_id, Intervention.teacher_id == current_user.id)
        .first()
    )
    if not interv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention with ID {payload.intervention_id} not found in your records.",
        )

    fu = db.query(FollowUpResult).filter(FollowUpResult.intervention_id == interv.id).first()
    now = datetime.now(timezone.utc)
    if fu:
        fu.outcome_status = payload.outcome_status
        fu.outcome_score = payload.outcome_score
        fu.observations = payload.observations
        fu.recorded_at = now
    else:
        fu = FollowUpResult(
            intervention_id=interv.id,
            outcome_status=payload.outcome_status,
            outcome_score=payload.outcome_score,
            observations=payload.observations,
            recorded_at=now,
        )
        db.add(fu)

    if payload.outcome_status == "resolved":
        interv.status = "completed"
        if interv.learning_gap_id:
            gap = (
                db.query(LearningGap)
                .filter(LearningGap.id == interv.learning_gap_id, LearningGap.teacher_id == current_user.id)
                .first()
            )
            if gap:
                gap.status = "resolved"

    db.commit()
    return {"status": "success", "message": "Follow-up outcome logged successfully."}
