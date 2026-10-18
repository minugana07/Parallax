from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.academic_class import AcademicClass
from app.models.student import Student
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.topic import Topic, LearningGap
from app.models.intervention import Intervention
from app.models.follow_up import FollowUpResult
from app.schemas.dashboard import (
    DashboardOverviewResponse,
    DashboardMetrics,
    ClassPerformanceItem,
    LearningGapSummary,
    StudentSupportItem,
    RecentAssessmentItem,
    MemoryEnginePreviewItem,
    TeachingRecommendation,
)

router = APIRouter()


@router.get(
    "/overview",
    response_model=DashboardOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Teacher Dashboard Overview",
    description="Returns consolidated metrics, class performance charts, learning gaps, memory chains, and recommendations scoped to authenticated teacher.",
)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardOverviewResponse:
    uid = current_user.id

    # 1. Metrics (Scoped strictly to authenticated teacher)
    academic_classes_count = db.query(AcademicClass).filter(AcademicClass.teacher_id == uid, AcademicClass.is_archived == False).count()
    if academic_classes_count > 0:
        classes_count = academic_classes_count
    else:
        classes_tuples = (
            db.query(Student.grade_level, Student.section)
            .filter(Student.teacher_id == uid, Student.is_archived == False)
            .distinct()
            .all()
        )
        classes_count = len(classes_tuples)

    students_count = db.query(Student).filter(Student.teacher_id == uid, Student.is_archived == False).count()
    assessments_count = db.query(Assessment).filter(Assessment.teacher_id == uid).count()
    learning_gaps_count = (
        db.query(LearningGap)
        .filter(LearningGap.teacher_id == uid, LearningGap.status != "resolved")
        .count()
    )
    active_interventions_count = (
        db.query(Intervention)
        .filter(Intervention.teacher_id == uid, Intervention.teacher_approved == True)
        .count()
    )
    resolved_outcomes_count = (
        db.query(FollowUpResult)
        .join(Intervention, FollowUpResult.intervention_id == Intervention.id)
        .filter(Intervention.teacher_id == uid, FollowUpResult.outcome_status == "resolved")
        .count()
    )

    metrics = DashboardMetrics(
        classes_count=classes_count,
        students_count=students_count,
        assessments_count=assessments_count,
        learning_gaps_count=learning_gaps_count,
        active_interventions_count=active_interventions_count,
        resolved_outcomes_count=resolved_outcomes_count,
    )

    # 2. Class Performance Trends (for Recharts)
    assessments = (
        db.query(Assessment)
        .filter(Assessment.teacher_id == uid)
        .order_by(Assessment.assessment_date.asc())
        .all()
    )
    class_perf_items: List[ClassPerformanceItem] = []

    for asm in assessments:
        scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.assessment_id == asm.id).all()
        if scores:
            avg_score = sum(s.percentage or ((s.score / asm.max_score) * 100.0) for s in scores) / len(scores)
            passing = [s for s in scores if (s.percentage or ((s.score / asm.max_score) * 100.0)) >= 50.0]
            pass_rate = (len(passing) / len(scores)) * 100.0
        else:
            avg_score = 0.0
            pass_rate = 0.0

        class_perf_items.append(
            ClassPerformanceItem(
                assessment_id=asm.id,
                title=asm.title,
                subject=asm.subject,
                class_name=asm.grade_level,
                average_score=round(avg_score, 1),
                benchmark_score=75.0,
                pass_rate=round(pass_rate, 1),
                total_students=len(scores),
                assessment_date=asm.assessment_date.strftime("%b %d") if asm.assessment_date else "Recent",
            )
        )

    # 3. Learning Gaps
    gaps = (
        db.query(LearningGap, Topic, Student)
        .join(Topic, LearningGap.topic_id == Topic.id)
        .join(Student, LearningGap.student_id == Student.id)
        .filter(LearningGap.teacher_id == uid)
        .all()
    )

    topic_gaps_map = {}
    for gap, topic, student in gaps:
        if topic.id not in topic_gaps_map:
            topic_gaps_map[topic.id] = {
                "gap_id": gap.id,
                "topic_id": topic.id,
                "topic_name": topic.name,
                "subject": topic.subject,
                "grade_level": topic.grade_level,
                "severity": gap.severity,
                "count": 0,
                "evidence_list": [],
                "status": gap.status,
            }
        topic_gaps_map[topic.id]["count"] += 1
        if gap.evidence:
            topic_gaps_map[topic.id]["evidence_list"].append(gap.evidence)
        if gap.severity == "critical":
            topic_gaps_map[topic.id]["severity"] = "critical"

    learning_gaps_summary: List[LearningGapSummary] = []
    total_class = students_count or 1
    for item in topic_gaps_map.values():
        evidence_str = " | ".join(item["evidence_list"][:2]) if item["evidence_list"] else "Assessment item errors observed."
        strategy = (
            "Visual geometric area model + structured pair work"
            if "Factoring" in item["topic_name"]
            else "Interactive PhET simulation + explicit contact-force checklists"
            if "Newton" in item["topic_name"]
            else "Multimeter physical breadboard circuit verification"
            if "Circuit" in item["topic_name"]
            else "Targeted concept revisit with dual-pathway diagrams"
        )
        learning_gaps_summary.append(
            LearningGapSummary(
                id=item["gap_id"],
                topic_id=item["topic_id"],
                topic_name=item["topic_name"],
                subject=item["subject"],
                grade_level=item["grade_level"],
                severity=item["severity"],
                affected_students_count=item["count"],
                total_class_students=total_class,
                affected_percentage=round((item["count"] / total_class) * 100.0, 1),
                evidence=evidence_str,
                suggested_strategy=strategy,
                status=item["status"],
            )
        )

    learning_gaps_summary.sort(key=lambda x: (0 if x.severity == "critical" else 1, -x.affected_students_count))

    # 4. Students Needing Support (evidence-backed, non-judgmental)
    students_support: List[StudentSupportItem] = []
    for gap, topic, student in gaps:
        recent_score = (
            db.query(StudentAssessmentScore)
            .filter(StudentAssessmentScore.student_id == student.id)
            .order_by(StudentAssessmentScore.recorded_at.desc())
            .first()
        )
        score_pct = recent_score.percentage if recent_score and recent_score.percentage is not None else 45.0
        support_status = "intervention_active" if gap.status == "in_progress" else "pending_intervention"
        students_support.append(
            StudentSupportItem(
                student_id=student.id,
                student_id_code=student.student_id_code,
                full_name=student.full_name,
                grade_level=student.grade_level,
                section=student.section or "A",
                subject=topic.subject,
                topic_name=topic.name,
                recent_score_percent=round(score_pct, 1),
                evidence=gap.evidence or "Demonstrated conceptual bottleneck in recent assessment.",
                support_status=support_status,
            )
        )

    # 5. Recent Assessments
    recent_assessments: List[RecentAssessmentItem] = []
    for asm in reversed(assessments[-4:]):
        scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.assessment_id == asm.id).all()
        if scores:
            avg_score = sum(s.score for s in scores) / len(scores)
            avg_pct = sum(s.percentage or ((s.score / asm.max_score) * 100.0) for s in scores) / len(scores)
        else:
            avg_score = 0.0
            avg_pct = 0.0

        recent_assessments.append(
            RecentAssessmentItem(
                id=asm.id,
                title=asm.title,
                subject=asm.subject,
                grade_level=asm.grade_level,
                max_score=asm.max_score,
                average_score=round(avg_score, 1),
                average_percent=round(avg_pct, 1),
                submission_count=len(scores),
                total_enrolled=12 if "9" in asm.grade_level else 12,
                assessment_date=asm.assessment_date.strftime("%d %b %Y") if asm.assessment_date else "Recently",
            )
        )

    # 6. Teacher Memory Engine Preview Chains
    interventions = (
        db.query(Intervention, Student, Topic, LearningGap)
        .join(Student, Intervention.student_id == Student.id)
        .outerjoin(Topic, Intervention.topic_id == Topic.id)
        .outerjoin(LearningGap, Intervention.learning_gap_id == LearningGap.id)
        .filter(Intervention.teacher_id == uid)
        .all()
    )

    memory_chains: List[MemoryEnginePreviewItem] = []
    for interv, student, topic, gap in interventions:
        follow_up = db.query(FollowUpResult).filter(FollowUpResult.intervention_id == interv.id).first()

        recent_score = (
            db.query(StudentAssessmentScore)
            .filter(StudentAssessmentScore.student_id == student.id)
            .first()
        )
        before_pct = recent_score.percentage if recent_score and recent_score.percentage is not None else 42.0

        memory_chains.append(
            MemoryEnginePreviewItem(
                id=interv.id,
                topic_name=topic.name if topic else "General Curriculum",
                subject=topic.subject if topic else "General",
                student_id_code=student.student_id_code,
                student_name=student.full_name,
                assessment_evidence=gap.evidence if gap and gap.evidence else "Diagnostic score below competency threshold.",
                learning_gap=f"Conceptual gap in {topic.name if topic else 'topic'}; sign & coefficient handling." if topic else "Identified gap",
                gap_severity=gap.severity if gap else "moderate",
                intervention_title=interv.title,
                strategy_type=interv.strategy_type,
                teacher_approved=interv.teacher_approved,
                outcome_status=follow_up.outcome_status if follow_up else "pending",
                before_score_percent=round(before_pct, 1),
                after_score_percent=follow_up.outcome_score if follow_up else None,
                observation_notes=follow_up.observations if follow_up else "Awaiting follow-up re-assessment check.",
            )
        )

    # 7. Teaching Recommendation for Next Class
    if learning_gaps_summary:
        top_gap = learning_gaps_summary[0]
        recommendation = TeachingRecommendation(
            topic_name=top_gap.topic_name,
            subject=top_gap.subject,
            grade_level=top_gap.grade_level,
            priority_level="high" if top_gap.severity == "critical" else "medium",
            reason_evidence=top_gap.evidence,
            suggested_action=top_gap.suggested_strategy,
            estimated_time_minutes=20,
            source_assessment=assessments[0].title if assessments else "Classroom Diagnostic",
        )
    elif students_count > 0:
        recommendation = TeachingRecommendation(
            topic_name="Formative Review",
            subject="General",
            grade_level="Active Roster",
            priority_level="normal",
            reason_evidence="Active classes enrolled with no critical gaps detected.",
            suggested_action="Conduct targeted formative check to evaluate baseline mastery.",
            estimated_time_minutes=15,
            source_assessment="Ongoing Formative",
        )
    else:
        recommendation = TeachingRecommendation(
            topic_name="Welcome to Parallax",
            subject="Getting Started",
            grade_level="Setup",
            priority_level="normal",
            reason_evidence="Ready for classroom data.",
            suggested_action="Create your first assessment to begin tracking learning evidence and teacher interventions.",
            estimated_time_minutes=10,
            source_assessment="Orientation",
        )

    return DashboardOverviewResponse(
        metrics=metrics,
        class_performance=class_perf_items,
        learning_gaps=learning_gaps_summary,
        students_needing_support=students_support[:6],
        recent_assessments=recent_assessments,
        memory_engine_preview=memory_chains,
        teaching_recommendation=recommendation,
        is_demo_data=current_user.is_demo,
    )
