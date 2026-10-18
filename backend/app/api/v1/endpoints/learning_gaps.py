from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.topic import Topic, LearningGap
from app.models.student import Student
from app.schemas.dashboard import LearningGapSummary

router = APIRouter()


@router.get(
    "",
    response_model=List[LearningGapSummary],
    status_code=status.HTTP_200_OK,
    summary="List Learning Gaps",
    description="Returns identified learning gaps belonging to the authenticated teacher, ranked by severity.",
)
def list_learning_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[LearningGapSummary]:
    gaps = (
        db.query(LearningGap, Topic, Student)
        .join(Topic, LearningGap.topic_id == Topic.id)
        .join(Student, LearningGap.student_id == Student.id)
        .filter(LearningGap.teacher_id == current_user.id)
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

    # Total teacher students
    teacher_students_count = db.query(Student).filter(Student.teacher_id == current_user.id).count() or 1

    results: List[LearningGapSummary] = []
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
        results.append(
            LearningGapSummary(
                id=item["gap_id"],
                topic_id=item["topic_id"],
                topic_name=item["topic_name"],
                subject=item["subject"],
                grade_level=item["grade_level"],
                severity=item["severity"],
                affected_students_count=item["count"],
                total_class_students=teacher_students_count,
                affected_percentage=round((item["count"] / teacher_students_count) * 100.0, 1),
                evidence=evidence_str,
                suggested_strategy=strategy,
                status=item["status"],
            )
        )

    results.sort(key=lambda x: (0 if x.severity == "critical" else 1, -x.affected_students_count))
    return results


@router.get(
    "/{gap_id}",
    response_model=LearningGapSummary,
    status_code=status.HTTP_200_OK,
    summary="Get Learning Gap Details",
    description="Returns detailed evidence for an individual learning gap owned by the teacher.",
)
def get_learning_gap_detail(
    gap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningGapSummary:
    gap_record = (
        db.query(LearningGap, Topic, Student)
        .join(Topic, LearningGap.topic_id == Topic.id)
        .join(Student, LearningGap.student_id == Student.id)
        .filter(LearningGap.id == gap_id, LearningGap.teacher_id == current_user.id)
        .first()
    )
    if not gap_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Learning gap with ID {gap_id} not found.",
        )

    gap, topic, student = gap_record
    teacher_students_count = db.query(Student).filter(Student.teacher_id == current_user.id).count() or 1

    strategy = (
        "Visual geometric area model + structured pair work"
        if "Factoring" in topic.name
        else "Interactive PhET simulation + explicit contact-force checklists"
        if "Newton" in topic.name
        else "Multimeter physical breadboard circuit verification"
        if "Circuit" in topic.name
        else "Targeted concept revisit with dual-pathway diagrams"
    )

    return LearningGapSummary(
        id=gap.id,
        topic_id=topic.id,
        topic_name=topic.name,
        subject=topic.subject,
        grade_level=topic.grade_level,
        severity=gap.severity,
        affected_students_count=1,
        total_class_students=teacher_students_count,
        affected_percentage=round((1 / teacher_students_count) * 100.0, 1),
        evidence=gap.evidence or "Assessment item errors observed.",
        suggested_strategy=strategy,
        status=gap.status,
    )
