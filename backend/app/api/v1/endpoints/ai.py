from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.topic import Topic, LearningGap
from app.models.student import Student
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.intervention import Intervention
from app.models.follow_up import FollowUpResult
from app.services.gemini_service import gemini_service
from app.schemas.ai import (
    AIStatusResponse,
    AIDiagnosticResponse,
    GapExplanationRequest,
    GapExplanationResponse,
    InterventionRecommendationRequest,
    InterventionRecommendationResponse,
    InterventionProposal,
    TeacherAssistantRequest,
    TeacherAssistantResponse,
    MemorySummaryRequest,
    MemorySummaryResponse,
)
from app.schemas.assessment import (
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestion,
)

router = APIRouter()


@router.get(
    "/status",
    response_model=AIStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Gemini AI Configuration Status",
    description="Reports whether Gemini AI is configured without exposing secrets or credentials.",
)
def get_ai_status() -> AIStatusResponse:
    return AIStatusResponse(
        gemini_configured=gemini_service.is_configured(),
        default_model=settings.GEMINI_MODEL,
        active_fallback=settings.GEMINI_FALLBACK_MODEL,
    )


@router.post(
    "/diagnostic",
    response_model=AIDiagnosticResponse,
    status_code=status.HTTP_200_OK,
    summary="Minimal AI Diagnostic Check",
    description="Sends a harmless test ping to Gemini and confirms model connectivity for authenticated teachers.",
)
def run_ai_diagnostic(
    current_user: User = Depends(get_current_user),
) -> AIDiagnosticResponse:
    result = gemini_service.diagnostic_test()
    if result["status"] == "error":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Gemini API check failed: {result['message']}",
        )
    return AIDiagnosticResponse(
        status=result["status"],
        model_used=result.get("model_used"),
        latency_ms=result.get("latency_ms"),
        message=result.get("message", "Operational"),
    )


@router.post(
    "/explain-gap",
    response_model=GapExplanationResponse,
    status_code=status.HTTP_200_OK,
    summary="Explain Learning Gap with Gemini AI",
    description="Generates an evidence-grounded explanation of an identified student gap.",
)
def explain_learning_gap(
    payload: GapExplanationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GapExplanationResponse:
    if not gemini_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env.",
        )

    # Scoped strictly to authenticated teacher
    gap_record = (
        db.query(LearningGap, Topic, Student)
        .join(Topic, LearningGap.topic_id == Topic.id)
        .join(Student, LearningGap.student_id == Student.id)
        .filter(LearningGap.id == payload.gap_id, LearningGap.teacher_id == current_user.id)
        .first()
    )
    if not gap_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning gap with ID {payload.gap_id} not found in your records.",
        )

    gap, topic, student = gap_record

    # Student privacy: anonymize identifier, never send full name or sensitive profile
    anonymized_code = f"Student #{student.student_id_code} ({student.grade_level})"
    evidence_text = gap.evidence or "Observed persistent difficulty on recent assessment items."

    try:
        explanation = gemini_service.explain_learning_gap(
            topic_name=topic.name,
            subject=topic.subject,
            grade_level=topic.grade_level,
            evidence=evidence_text,
            anonymized_student_code=anonymized_code,
            severity=gap.severity,
        )

        return GapExplanationResponse(
            gap_id=gap.id,
            topic_name=topic.name,
            subject=topic.subject,
            evidence_analysis=explanation.get("evidence_analysis", ""),
            key_skills_needing_attention=explanation.get("key_skills_needing_attention", []),
            unsupported_claims=explanation.get("unsupported_claims", ""),
            recommended_diagnostic_checks=explanation.get("recommended_diagnostic_checks", []),
            evidence_strength=explanation.get("evidence_strength", "moderate"),
            model_used=explanation.get("model_used", "gemini-3.8-flash"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation temporarily unavailable: {str(exc)}",
        )


@router.post(
    "/recommend-intervention",
    response_model=InterventionRecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Recommend Teaching Interventions",
    description="Generates actionable, classroom-ready intervention proposals based on learning gap evidence.",
)
def recommend_intervention(
    payload: InterventionRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InterventionRecommendationResponse:
    if not gemini_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env.",
        )

    gap_record = (
        db.query(LearningGap, Topic)
        .join(Topic, LearningGap.topic_id == Topic.id)
        .filter(LearningGap.id == payload.gap_id, LearningGap.teacher_id == current_user.id)
        .first()
    )
    if not gap_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning gap with ID {payload.gap_id} not found in your records.",
        )

    gap, topic = gap_record
    evidence_text = gap.evidence or "Struggling with core conceptual mechanics."

    try:
        raw_res = gemini_service.recommend_interventions(
            topic_name=topic.name,
            subject=topic.subject,
            grade_level=topic.grade_level,
            evidence=evidence_text,
            severity=gap.severity,
        )

        proposals = []
        for p in raw_res.get("proposals", []):
            proposals.append(
                InterventionProposal(
                    title=p.get("title", f"Remediation on {topic.name}"),
                    strategy_type=p.get("strategy_type", "concept_revisit"),
                    learning_objective=p.get("learning_objective", f"Master core principles of {topic.name}"),
                    classroom_activity=p.get("classroom_activity", "Conduct small group practice with teacher feedback."),
                    duration_minutes=int(p.get("duration_minutes", 15)),
                    materials_needed=p.get("materials_needed", "Worksheet and whiteboard"),
                    check_understanding=p.get("check_understanding", "Formative exit ticket"),
                    evidence_basis=p.get("evidence_basis", "Directly targets errors observed in assessment evidence."),
                    limitations=p.get("limitations", "Requires student prerequisite readiness."),
                    requires_teacher_approval=True,
                )
            )

        return InterventionRecommendationResponse(
            gap_id=gap.id,
            topic_name=topic.name,
            proposals=proposals,
            model_used=raw_res.get("model_used", "gemini-3.8-flash"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Intervention recommendation failed: {str(exc)}",
        )


@router.post(
    "/assistant",
    response_model=TeacherAssistantResponse,
    status_code=status.HTTP_200_OK,
    summary="Contextual Teacher Assistant",
    description="Answers pedagogical and classroom inquiries using authorized teacher context.",
)
def teacher_assistant(
    payload: TeacherAssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeacherAssistantResponse:
    if not gemini_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env.",
        )

    # Build concise, privacy-safe context based on teacher data
    context_lines = []
    classes_cnt = db.query(Student.grade_level).filter(Student.teacher_id == current_user.id).distinct().count()
    students_cnt = db.query(Student).filter(Student.teacher_id == current_user.id).count()
    context_lines.append(f"Teacher has {classes_cnt} active class sections and {students_cnt} total enrolled students.")

    # Top learning gaps
    gaps = (
        db.query(LearningGap, Topic)
        .join(Topic, LearningGap.topic_id == Topic.id)
        .filter(LearningGap.teacher_id == current_user.id, LearningGap.status != "resolved")
        .limit(3)
        .all()
    )
    for g, t in gaps:
        context_lines.append(f"- Active Gap: {t.name} ({t.subject}, {t.grade_level}) - Severity: {g.severity}. Evidence: {g.evidence}")

    # Specific requested context
    if payload.context_type == "gap" and payload.context_id:
        target_gap = (
            db.query(LearningGap, Topic)
            .join(Topic, LearningGap.topic_id == Topic.id)
            .filter(LearningGap.id == payload.context_id, LearningGap.teacher_id == current_user.id)
            .first()
        )
        if target_gap:
            context_lines.append(f"FOCUSED INQUIRY on Gap #{payload.context_id}: {target_gap[1].name} ({target_gap[1].subject}). Evidence: {target_gap[0].evidence}")

    elif payload.context_type == "assessment" and payload.context_id:
        target_asm = (
            db.query(Assessment)
            .filter(Assessment.id == payload.context_id, Assessment.teacher_id == current_user.id)
            .first()
        )
        if target_asm:
            context_lines.append(f"FOCUSED INQUIRY on Assessment: {target_asm.title} ({target_asm.subject}, Max score: {target_asm.max_score})")

    context_summary = "\n".join(context_lines)

    try:
        res = gemini_service.answer_teacher_assistant(
            question=payload.question,
            context_summary=context_summary,
            teacher_name=current_user.full_name,
        )

        return TeacherAssistantResponse(
            answer=res.get("answer", "I am here to assist with your pedagogical planning and data analysis."),
            suggested_follow_up_questions=res.get("suggested_follow_up_questions", []),
            context_used=payload.context_type or "general_roster",
            model_used=res.get("model_used", "gemini-3.8-flash"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Assistant service temporarily unavailable: {str(exc)}",
        )


@router.post(
    "/memory-summary",
    response_model=MemorySummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Teacher Memory Longitudinal Summary",
    description="Synthesizes evidence from pre-intervention to follow-up without claiming unfounded causality.",
)
def summarize_memory(
    payload: MemorySummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MemorySummaryResponse:
    if not gemini_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI is not configured. Please add GEMINI_API_KEY to backend/.env.",
        )

    interv_record = (
        db.query(Intervention, Student, Topic, LearningGap)
        .join(Student, Intervention.student_id == Student.id)
        .outerjoin(Topic, Intervention.topic_id == Topic.id)
        .outerjoin(LearningGap, Intervention.learning_gap_id == LearningGap.id)
        .filter(Intervention.id == payload.intervention_id, Intervention.teacher_id == current_user.id)
        .first()
    )
    if not interv_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention with ID {payload.intervention_id} not found in your records.",
        )

    interv, student, topic, gap = interv_record
    follow_up = db.query(FollowUpResult).filter(FollowUpResult.intervention_id == interv.id).first()

    recent_score = (
        db.query(StudentAssessmentScore)
        .filter(StudentAssessmentScore.student_id == student.id)
        .first()
    )
    before_pct = recent_score.percentage if recent_score and recent_score.percentage is not None else 40.0

    asm = None
    if recent_score:
        asm = db.query(Assessment).filter(Assessment.id == recent_score.assessment_id).first()
    asm_title = asm.title if asm else "Baseline Assessment"

    try:
        raw_res = gemini_service.summarize_memory_chain(
            assessment_title=asm_title,
            pre_evidence=gap.evidence if gap and gap.evidence else "Baseline diagnostic score below threshold.",
            initial_score=round(before_pct, 1),
            intervention_title=interv.title,
            strategy_type=interv.strategy_type,
            outcome_status=follow_up.outcome_status if follow_up else "pending",
            outcome_score=follow_up.outcome_score if follow_up else None,
            observations=follow_up.observations if follow_up and follow_up.observations else "Awaiting follow-up check.",
        )

        return MemorySummaryResponse(
            intervention_id=interv.id,
            observed_changes=raw_res.get("observed_changes", "Performance change logged across checks."),
            evidence_strength=raw_res.get("evidence_strength", "moderate"),
            causality_caveat=raw_res.get("causality_caveat", "Score changes reflect combined instructional and classroom practice factors."),
            suggested_next_step=raw_res.get("suggested_next_step", "Continue monitoring progress on subsequent assessments."),
            model_used=raw_res.get("model_used", "gemini-3.8-flash"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Memory summary failed: {str(exc)}",
        )


@router.post(
    "/generate-quiz",
    response_model=QuizGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate Quiz Questions with AI",
    description="Generates college-level multiple choice questions with correct options, marks, and explanations.",
)
def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
) -> QuizGenerateResponse:
    try:
        raw_res = gemini_service.generate_quiz_draft(
            topic_name=payload.topic_name,
            course_code=payload.course_code,
            semester=payload.semester,
            subject=payload.subject or "Computer Science & Engineering",
            question_count=payload.question_count,
            difficulty=payload.difficulty or "intermediate",
        )
        questions = [
            QuizQuestion(**q) for q in raw_res.get("questions", [])
        ]
        return QuizGenerateResponse(
            topic_name=payload.topic_name,
            questions=questions,
            model_used=raw_res.get("model_used", "gemini-3.8-flash"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Quiz generation failed: {str(exc)}",
        )
