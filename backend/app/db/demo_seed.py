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

    from app.models.user import User
    from app.db.migrations import DEMO_TEACHER_EMAIL
    demo_user = db.query(User).filter(User.email == DEMO_TEACHER_EMAIL).first()
    demo_uid = demo_user.id if demo_user else None

    # 1. Topics (Higher-Education Computing & Engineering)
    topics_data = [
        # Semester 5 - Data Structures & Algorithms
        Topic(
            subject="Data Structures & Algorithms",
            name="Graph Algorithms & Minimum Spanning Trees",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS52",
            description="Prim's and Kruskal's algorithms, cut property, disjoint-set union, and cycle detection.",
        ),
        Topic(
            subject="Data Structures & Algorithms",
            name="Dynamic Programming & Memoization",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS52",
            description="Optimal substructure, overlapping subproblems, 0/1 knapsack, and sequence alignment.",
        ),
        # Semester 5 - Operating Systems
        Topic(
            subject="Operating Systems",
            name="Concurrency, Deadlocks & Synchronization",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS53",
            description="Mutex locks, semaphores, producer-consumer problem, deadlock conditions, and Banker's algorithm.",
        ),
        Topic(
            subject="Operating Systems",
            name="Virtual Memory & Demand Paging",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS53",
            description="Page fault handling, TLB reach, LRU/FIFO page replacement, and thrashing mitigation.",
        ),
        # Semester 3 - Database Management
        Topic(
            subject="Database Management",
            name="Relational Normalization & Functional Dependencies",
            grade_level="Semester 3",
            semester="Semester 3",
            course_code="22IS32",
            description="1NF through BCNF decomposition, lossless join property, and dependency preservation.",
        ),
        Topic(
            subject="Database Management",
            name="Transaction Isolation & 2-Phase Locking",
            grade_level="Semester 3",
            semester="Semester 3",
            course_code="22IS32",
            description="ACID properties, serializability graphs, read-committed vs repeatable-read, and 2PL protocols.",
        ),
    ]
    db.add_all(topics_data)
    db.flush()

    # 2. Students (24 deterministic college engineering students across active sections)
    students_list = [
        # Semester 5 - Section A (DSA & OS)
        ("1RV23CS001", "Aarav Patel", "Semester 5", "A", "Computer Science & Engineering"),
        ("1RV23CS002", "Diya Sengupta", "Semester 5", "A", "Computer Science & Engineering"),
        ("1RV23CS003", "Kabir Nair", "Semester 5", "A", "Computer Science & Engineering"),
        ("1RV23CS004", "Ananya Rao", "Semester 5", "A", "Computer Science & Engineering"),
        ("1RV23CS005", "Ishaan Joshi", "Semester 5", "A", "Computer Science & Engineering"),
        ("1RV23CS006", "Mira Kulkarni", "Semester 5", "A", "Computer Science & Engineering"),
        # Semester 5 - Section B (DSA & OS)
        ("1RV23CS007", "Rohan Verma", "Semester 5", "B", "Computer Science & Engineering"),
        ("1RV23CS008", "Sneha Iyer", "Semester 5", "B", "Computer Science & Engineering"),
        ("1RV23CS009", "Vihaan Desai", "Semester 5", "B", "Computer Science & Engineering"),
        ("1RV23CS010", "Pooja Hegde", "Semester 5", "B", "Computer Science & Engineering"),
        ("1RV23CS011", "Arjun Reddy", "Semester 5", "B", "Computer Science & Engineering"),
        ("1RV23CS012", "Tanvi Bhat", "Semester 5", "B", "Computer Science & Engineering"),
        # Semester 3 - Section A (DBMS & OOP)
        ("1RV24IS001", "Siddharth Menon", "Semester 3", "A", "Information Science & Engineering"),
        ("1RV24IS002", "Aditi Rao", "Semester 3", "A", "Information Science & Engineering"),
        ("1RV24IS003", "Varun Shenoy", "Semester 3", "A", "Information Science & Engineering"),
        ("1RV24IS004", "Kavya Prabhu", "Semester 3", "A", "Information Science & Engineering"),
        ("1RV24IS005", "Nikhil Kamath", "Semester 3", "A", "Information Science & Engineering"),
        ("1RV24IS006", "Meera D'Souza", "Semester 3", "A", "Information Science & Engineering"),
        # Semester 3 - Section B (DBMS & OOP)
        ("1RV24IS007", "Devansh Sharma", "Semester 3", "B", "Information Science & Engineering"),
        ("1RV24IS008", "Rhea Pillai", "Semester 3", "B", "Information Science & Engineering"),
        ("1RV24IS009", "Manish Gowda", "Semester 3", "B", "Information Science & Engineering"),
        ("1RV24IS010", "Tara Acharya", "Semester 3", "B", "Information Science & Engineering"),
        ("1RV24IS011", "Karan Singhania", "Semester 3", "B", "Information Science & Engineering"),
        ("1RV24IS012", "Priyanka Shetty", "Semester 3", "B", "Information Science & Engineering"),
    ]

    student_objs = []
    for code, name, sem, sec, dept in students_list:
        clean_email = code.lower() + "@rvce.edu.in"
        student = Student(
            teacher_id=demo_uid,
            student_id_code=code,
            full_name=name,
            grade_level=sem,
            semester=sem,
            section=sec,
            department=dept,
            email=clean_email,
        )
        student_objs.append(student)
    db.add_all(student_objs)
    db.flush()

    # 3. Assessments (College Examinations, Lab Tests & Quizzes)
    import json
    sample_quiz_questions = [
        {
            "id": "q1",
            "question_text": "In a connected, undirected graph with positive edge weights, what does Prim's algorithm compute?",
            "question_type": "mcq",
            "options": [
                "The shortest path between two specific vertices",
                "A minimum spanning tree connecting all vertices with minimum total edge weight",
                "The strongly connected components of the graph",
                "A topological ordering of all vertices"
            ],
            "correct_answer": 1,
            "marks": 2.0,
            "explanation": "Prim's algorithm is a greedy algorithm that computes a Minimum Spanning Tree (MST) by iteratively growing a tree from an arbitrary root vertex."
        },
        {
            "id": "q2",
            "question_text": "What is the time complexity of Dijkstra's algorithm implemented with a binary min-heap for a graph with V vertices and E edges?",
            "question_type": "mcq",
            "options": [
                "O(V^2)",
                "O((V + E) log V)",
                "O(V + E)",
                "O(E^2 log V)"
            ],
            "correct_answer": 1,
            "marks": 2.0,
            "explanation": "Using a binary min-heap, each vertex extraction takes O(log V) and each decrease-key edge relaxation takes O(log V), yielding O((V + E) log V)."
        },
        {
            "id": "q3",
            "question_text": "Which pair of properties is required for a problem to be solvable via Dynamic Programming?",
            "question_type": "mcq",
            "options": [
                "Greedy choice property and disjoint subproblems",
                "Optimal substructure and overlapping subproblems",
                "Linear recurrence and divide-and-conquer",
                "Acyclic state transition without base cases"
            ],
            "correct_answer": 1,
            "marks": 2.0,
            "explanation": "Dynamic programming applies specifically when a problem possesses both optimal substructure (optimal solution contains optimal solutions to subproblems) and overlapping subproblems (same subproblems are solved repeatedly)."
        }
    ]

    assessments_data = [
        Assessment(
            title="CIE-1: Graph Algorithms & Spanning Trees",
            subject="Data Structures & Algorithms",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS52",
            assessment_type="cie_exam",
            status="graded",
            passing_score=20.0,
            max_score=50.0,
            duration_minutes=60,
            description="First Continuous Internal Evaluation covering Greedy graph heuristics and MST algorithms.",
            assessment_date=now - timedelta(days=14),
        ),
        Assessment(
            title="Lab Assessment 1: Process Scheduling & Threads",
            subject="Operating Systems",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS53",
            assessment_type="lab_test",
            status="graded",
            passing_score=40.0,
            max_score=100.0,
            duration_minutes=120,
            description="Hands-on POSIX thread implementation and preemptive round-robin scheduler simulation.",
            assessment_date=now - timedelta(days=10),
        ),
        Assessment(
            title="Online Quiz 1: Dynamic Programming Concepts",
            subject="Data Structures & Algorithms",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS52",
            assessment_type="quiz",
            status="graded",
            passing_score=16.0,
            max_score=40.0,
            duration_minutes=25,
            total_questions=3,
            quiz_data=json.dumps(sample_quiz_questions),
            description="Concept check on recurrence formulation, memoization tables, and space optimization.",
            assessment_date=now - timedelta(days=6),
        ),
        Assessment(
            title="CIE-2: Virtual Memory & Page Replacement",
            subject="Operating Systems",
            grade_level="Semester 5",
            semester="Semester 5",
            course_code="22CS53",
            assessment_type="cie_exam",
            status="graded",
            passing_score=20.0,
            max_score=50.0,
            duration_minutes=60,
            description="Evaluation of demand paging, TLB hit ratio calculation, and page replacement traces.",
            assessment_date=now - timedelta(days=4),
        ),
        Assessment(
            title="Midterm: Relational Schema & Normalization",
            subject="Database Management",
            grade_level="Semester 3",
            semester="Semester 3",
            course_code="22IS32",
            assessment_type="midterm",
            status="graded",
            passing_score=40.0,
            max_score=100.0,
            duration_minutes=90,
            description="Mid-term exam on functional dependency canonical covers and 3NF/BCNF synthesis.",
            assessment_date=now - timedelta(days=3),
        ),
        Assessment(
            title="Quiz 2: Transaction Management & ACID",
            subject="Database Management",
            grade_level="Semester 3",
            semester="Semester 3",
            course_code="22IS32",
            assessment_type="quiz",
            status="graded",
            passing_score=24.0,
            max_score=60.0,
            duration_minutes=30,
            total_questions=3,
            quiz_data=json.dumps(sample_quiz_questions),
            description="Quiz on concurrency anomalies, write-ahead logging, and strict two-phase locking.",
            assessment_date=now - timedelta(days=1),
        ),
    ]
    db.add_all(assessments_data)
    db.flush()

    # 4. Student Assessment Scores
    # Distribute realistic scores for Semester 5 students across assessment 1 (DSA MST)
    g9_students = [s for s in student_objs if s.grade_level == "Semester 5"]
    # Seed Diagnostic 1 (Max 50)
    d1_scores = [22, 45, 38, 18, 48, 36, 24, 44, 40, 20, 42, 34]  # Aarav(22), Ananya(18), Rohan(24), Pooja(20) struggled
    for i, student in enumerate(g9_students):
        sc = d1_scores[i]
        pct = (sc / 50.0) * 100.0
        fb = "Needs review on Prim's cut property and cycle detection" if sc <= 24 else "Strong minimum spanning tree graph recognition"
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[0].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback=fb,
            recorded_at=now - timedelta(days=14),
        )
        db.add(score_entry)

    # Seed Unit 2 Exam (OS Concurrency - Max 100)
    u2_scores = [68, 88, 74, 52, 94, 82, 46, 85, 78, 54, 91, 76]
    for i, student in enumerate(g9_students):
        sc = u2_scores[i]
        pct = float(sc)
        fb = "Deadlock circular wait confused with resource preemption" if sc <= 55 else "Good conceptual clarity on Peterson's algorithm"
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[1].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback=fb,
            recorded_at=now - timedelta(days=10),
        )
        db.add(score_entry)

    # Seed Diagnostic 2 (OS Virtual Memory - Max 50)
    d2_scores = [35, 46, 32, 21, 48, 42, 36, 44, 38, 24, 45, 40]
    for i, student in enumerate(g9_students):
        sc = d2_scores[i]
        pct = (sc / 50.0) * 100.0
        score_entry = StudentAssessmentScore(
            assessment_id=assessments_data[3].id,
            student_id=student.id,
            score=float(sc),
            percentage=pct,
            feedback="Distinction between TLB miss and page fault trap needs reinforcement" if sc < 30 else "Solid",
            recorded_at=now - timedelta(days=4),
        )
        db.add(score_entry)

    # Seed Semester 3 Scores
    g10_students = [s for s in student_objs if s.grade_level == "Semester 3"]
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
