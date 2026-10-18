"""
Deterministic educational sample data for Parallax Teacher Intelligence Platform.
Provides realistic classroom evidence, learning gaps, interventions, and follow-up outcomes.
Explicitly labelled as demo data for evaluation and hackathon jury demonstrations.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.topic import Topic, LearningGap
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.intervention import Intervention
from app.models.follow_up import FollowUpResult


def seed_demo_data(db: Session, force: bool = False) -> bool:
    """
    Seeds deterministic classroom data if the database is currently empty.
    Returns True if seeding occurred, False if skipped.
    """
    if not force:
        existing_students = db.query(Student).first()
        if existing_students is not None:
            return False  # Database already seeded or populated

    now = datetime.now(timezone.utc)

    # 1. Topics
    topics_data = [
        # Grade 9 Mathematics
        Topic(
            subject="Mathematics",
            name="Quadratic Factoring & Trinomial Roots",
            grade_level="Grade 9",
            description="Factoring monic and non-monic quadratics, middle-term splitting, and zero product property.",
        ),
        Topic(
            subject="Mathematics",
            name="Systems of Linear Equations",
            grade_level="Grade 9",
            description="Solving simultaneous equations using substitution, elimination, and graphical intersections.",
        ),
        # Grade 9 Science
        Topic(
            subject="Science",
            name="Newton's Laws & Force Interactions",
            grade_level="Grade 9",
            description="Inertia, F=ma calculations, and action-reaction pairs vs balanced forces.",
        ),
        Topic(
            subject="Science",
            name="Cellular Respiration & Energy Cycles",
            grade_level="Grade 9",
            description="Aerobic and anaerobic respiration, glycolysis, ATP synthesis, and gas exchange.",
        ),
        # Grade 10 Mathematics
        Topic(
            subject="Mathematics",
            name="Coordinate Geometry & Slope Relationships",
            grade_level="Grade 10",
            description="Distance formula, midpoint, parallel vs perpendicular slopes, and linear equations.",
        ),
        # Grade 10 Science
        Topic(
            subject="Science",
            name="Electric Circuits & Ohm's Law",
            grade_level="Grade 10",
            description="Current division in parallel branches, series resistance, and potential difference.",
        ),
    ]
    db.add_all(topics_data)
    db.flush()

    # 2. Students (24 deterministic students across 4 sections)
    students_list = [
        # Grade 9 - Section A (Math & Science)
        ("STU-101", "Aarav Patel", "Grade 9", "A"),
        ("STU-102", "Diya Sengupta", "Grade 9", "A"),
        ("STU-103", "Kabir Nair", "Grade 9", "A"),
        ("STU-104", "Ananya Rao", "Grade 9", "A"),
        ("STU-105", "Ishaan Joshi", "Grade 9", "A"),
        ("STU-106", "Mira Kulkarni", "Grade 9", "A"),
        # Grade 9 - Section B (Math & Science)
        ("STU-107", "Rohan Verma", "Grade 9", "B"),
        ("STU-108", "Sneha Iyer", "Grade 9", "B"),
        ("STU-109", "Vihaan Desai", "Grade 9", "B"),
        ("STU-110", "Pooja Hegde", "Grade 9", "B"),
        ("STU-111", "Arjun Reddy", "Grade 9", "B"),
        ("STU-112", "Tanvi Bhat", "Grade 9", "B"),
        # Grade 10 - Section A (Math & Science)
        ("STU-113", "Siddharth Menon", "Grade 10", "A"),
        ("STU-114", "Aditi Rao", "Grade 10", "A"),
        ("STU-115", "Varun Shenoy", "Grade 10", "A"),
        ("STU-116", "Kavya Prabhu", "Grade 10", "A"),
        ("STU-117", "Nikhil Kamath", "Grade 10", "A"),
        ("STU-118", "Meera D'Souza", "Grade 10", "A"),
        # Grade 10 - Section B (Math & Science)
        ("STU-119", "Devansh Sharma", "Grade 10", "B"),
        ("STU-120", "Rhea Pillai", "Grade 10", "B"),
        ("STU-121", "Manish Gowda", "Grade 10", "B"),
        ("STU-122", "Tara Acharya", "Grade 10", "B"),
        ("STU-123", "Karan Singhania", "Grade 10", "B"),
        ("STU-124", "Priyanka Shetty", "Grade 10", "B"),
    ]

    student_objs = []
    for code, name, grade, sec in students_list:
        student = Student(student_id_code=code, full_name=name, grade_level=grade, section=sec)
        student_objs.append(student)
    db.add_all(student_objs)
    db.flush()

    # 3. Assessments
    assessments_data = [
        Assessment(
            title="Diagnostic 1: Algebraic Factoring & Trinomials",
            subject="Mathematics",
            grade_level="Grade 9",
            max_score=50.0,
            assessment_date=now - timedelta(days=14),
        ),
        Assessment(
            title="Unit 2 Exam: Force Interactions & Newton's Laws",
            subject="Science",
            grade_level="Grade 9",
            max_score=100.0,
            assessment_date=now - timedelta(days=10),
        ),
        Assessment(
            title="Formative Quiz: Systems of Linear Equations",
            subject="Mathematics",
            grade_level="Grade 9",
            max_score=40.0,
            assessment_date=now - timedelta(days=6),
        ),
        Assessment(
            title="Diagnostic 2: Cellular Respiration & ATP Cycle",
            subject="Science",
            grade_level="Grade 9",
            max_score=50.0,
            assessment_date=now - timedelta(days=4),
        ),
        Assessment(
            title="Mid-Term Diagnostic: Coordinate Geometry & Slopes",
            subject="Mathematics",
            grade_level="Grade 10",
            max_score=100.0,
            assessment_date=now - timedelta(days=3),
        ),
        Assessment(
            title="Mastery Check: Electric Circuits & Ohm's Law",
            subject="Science",
            grade_level="Grade 10",
            max_score=60.0,
            assessment_date=now - timedelta(days=1),
        ),
    ]
    db.add_all(assessments_data)
    db.flush()

    # 4. Student Assessment Scores
    # Distribute realistic scores for Grade 9 students across assessment 1 (Math Factoring)
    g9_students = [s for s in student_objs if s.grade_level == "Grade 9"]
    # Seed Diagnostic 1 (Max 50)
    d1_scores = [22, 45, 38, 18, 48, 36, 24, 44, 40, 20, 42, 34]  # Aarav(22), Ananya(18), Rohan(24), Pooja(20) struggled
    for i, student in enumerate(g9_students):
        sc = d1_scores[i]
        pct = (sc / 50.0) * 100.0
        fb = "Needs review on non-monic middle-term splitting" if sc <= 24 else "Strong quadratic recognition"
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[0].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback=fb,
            recorded_at=now - timedelta(days=14),
        )
        db.add(score_entry)

    # Seed Unit 2 Exam (Science - Max 100)
    u2_scores = [68, 88, 74, 52, 94, 82, 46, 85, 78, 54, 91, 76]
    for i, student in enumerate(g9_students):
        sc = u2_scores[i]
        pct = float(sc)
        fb = "Action-reaction pairs confused with balanced forces" if sc <= 55 else "Good conceptual clarity on F=ma"
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[1].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback=fb,
            recorded_at=now - timedelta(days=10),
        )
        db.add(score_entry)

    # Seed Diagnostic 2 (Science - Max 50)
    d2_scores = [35, 46, 32, 21, 48, 42, 36, 44, 38, 24, 45, 40]
    for i, student in enumerate(g9_students):
        sc = d2_scores[i]
        pct = (sc / 50.0) * 100.0
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[3].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback="Distinction between photolysis and glycolysis needs reinforcement" if sc < 30 else "Solid",
            recorded_at=now - timedelta(days=4),
        )
        db.add(score_entry)

    # Seed Grade 10 Scores
    g10_students = [s for s in student_objs if s.grade_level == "Grade 10"]
    # Mid-term Coordinate Geometry (Max 100)
    g10_math_scores = [72, 89, 58, 92, 64, 85, 76, 90, 62, 88, 55, 94]
    for i, student in enumerate(g10_students):
        sc = g10_math_scores[i]
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[4].id,
            student_id=student.id,
            score=float(sc),
            percentage=float(sc),
            feedback="Slope reciprocal sign error on perpendicular lines" if sc <= 64 else "Excellent work",
            recorded_at=now - timedelta(days=3),
        )
        db.add(score_entry)

    # Electric Circuits (Max 60)
    g10_sci_scores = [38, 54, 32, 58, 36, 52, 44, 56, 34, 55, 30, 57]
    for i, student in enumerate(g10_students):
        sc = g10_sci_scores[i]
        pct = (sc / 60.0) * 100.0
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[5].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback="Current division in parallel branches requires circuit verification" if pct < 60 else "Mastered",
            recorded_at=now - timedelta(days=1),
        )
        db.add(score_entry)

    db.flush()

    # 5. Concrete Learning Gaps
    # Gap 1: Non-monic quadratic factoring (Aarav STU-101, Ananya STU-104, Rohan STU-107, Pooja STU-110)
    gaps_data = [
        LearningGap(
            student_id=student_objs[0].id,  # Aarav Patel
            topic_id=topics_data[0].id,     # Quadratic Factoring
            severity="critical",
            evidence="Diagnostic 1: Scored 22/50. 62% error rate on Q4 & Q5 requiring middle-term decomposition for coefficients a>1.",
            status="in_progress",
            detected_at=now - timedelta(days=14),
        ),
        LearningGap(
            student_id=student_objs[3].id,  # Ananya Rao
            topic_id=topics_data[0].id,     # Quadratic Factoring
            severity="critical",
            evidence="Diagnostic 1: Scored 18/50. Repeated sign error when expanding $(x-p)(x+q)$; missed middle term cancellation.",
            status="active",
            detected_at=now - timedelta(days=14),
        ),
        LearningGap(
            student_id=student_objs[6].id,  # Rohan Verma
            topic_id=topics_data[2].id,     # Newton's Laws
            severity="moderate",
            evidence="Unit 2 Exam: Scored 46/100. Free-body diagram incorrectly identified table normal force as gravitational reaction pair.",
            status="in_progress",
            detected_at=now - timedelta(days=10),
        ),
        LearningGap(
            student_id=student_objs[9].id,  # Pooja Hegde
            topic_id=topics_data[3].id,     # Cellular Respiration
            severity="moderate",
            evidence="Diagnostic 2: Scored 24/50. Conflated gas exchange inputs of photosynthesis with aerobic respiration pathways.",
            status="active",
            detected_at=now - timedelta(days=4),
        ),
        LearningGap(
            student_id=student_objs[12].id,  # Siddharth Menon
            topic_id=topics_data[5].id,      # Electric Circuits
            severity="critical",
            evidence="Mastery Check: Scored 38/60. Assumed equal current division across unequal parallel resistors (10Ω and 50Ω).",
            status="in_progress",
            detected_at=now - timedelta(days=1),
        ),
    ]
    db.add_all(gaps_data)
    db.flush()

    # 6. Interventions (Teacher Memory Engine Chains)
    # Intervention 1: Aarav Patel (Resolved chain)
    int1 = Intervention(
        student_id=student_objs[0].id,
        topic_id=topics_data[0].id,
        learning_gap_id=gaps_data[0].id,
        title="Visual Area Algebra-Tiles & Middle-Term Decomposition",
        strategy_type="visual_area_model",
        description="Teacher conducted a 20-minute targeted remediation using geometric rectangle area models to demonstrate why $(ax + p)(x + q)$ expands to produce middle terms.",
        status="completed",
        teacher_approved=True,
        created_at=now - timedelta(days=12),
        updated_at=now - timedelta(days=5),
    )
    db.add(int1)
    db.flush()

    # Follow-up for Intervention 1: Resolved!
    fu1 = FollowUpResult(
        intervention_id=int1.id,
        outcome_status="resolved",
        outcome_score=86.0,
        observations="Retest administered 5 days later. Aarav solved 4 out of 4 non-monic trinomials correctly. Sign confusion completely resolved.",
        recorded_at=now - timedelta(days=5),
    )
    db.add(fu1)

    # Intervention 2: Rohan Verma (Progressing chain)
    int2 = Intervention(
        student_id=student_objs[6].id,
        topic_id=topics_data[2].id,
        learning_gap_id=gaps_data[2].id,
        title="PhET Interactive Physics Simulation & Pair-Force Identifier",
        strategy_type="phet_simulation",
        description="Assigned guided inquiry using PhET interactive force simulation with explicit 3-question checklist: 'What exerts force? What feels force? Is it the same interaction?'",
        status="active",
        teacher_approved=True,
        created_at=now - timedelta(days=8),
        updated_at=now - timedelta(days=2),
    )
    db.add(int2)
    db.flush()

    # Follow-up for Intervention 2: Progressing
    fu2 = FollowUpResult(
        intervention_id=int2.id,
        outcome_status="progressing",
        outcome_score=72.0,
        observations="Follow-up exit ticket: Correctly identified contact pairs in collision scenarios. Still requires reinforcement on non-contact gravitational pairs.",
        recorded_at=now - timedelta(days=2),
    )
    db.add(fu2)

    # Intervention 3: Siddharth Menon (Active / Lab scheduled)
    int3 = Intervention(
        student_id=student_objs[12].id,
        topic_id=topics_data[5].id,
        learning_gap_id=gaps_data[4].id,
        title="Hands-on Breadboard Multimeter Current Division Lab",
        strategy_type="bench_laboratory",
        description="Teacher scheduled bench verification with physical multimeters measuring currents across 10Ω vs 50Ω parallel branches to observe inverse resistance relationship directly.",
        status="approved",
        teacher_approved=True,
        created_at=now - timedelta(days=1),
        updated_at=now - timedelta(days=1),
    )
    db.add(int3)
    db.flush()

    # Follow-up for Intervention 3: Pending verification
    fu3 = FollowUpResult(
        intervention_id=int3.id,
        outcome_status="pending",
        outcome_score=None,
        observations="Pre-lab hypothesis worksheet submitted. Lab execution scheduled for tomorrow's double period.",
        recorded_at=now - timedelta(hours=6),
    )
    db.add(fu3)

    db.commit()
    return True
