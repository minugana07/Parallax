"""
Deterministic collegiate demo dataset generator for RVCE Higher-Education Teachers.
Generates exactly 5 academic classes (~70 students each, total ~350 students)
with realistic engineering curriculum, assessments, marks distribution,
learning gaps, teacher-approved interventions, and longitudinal follow-ups.
"""
import random
import re
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.academic_class import AcademicClass
from app.models.student import Student
from app.models.topic import Topic, LearningGap
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.intervention import Intervention
from app.models.follow_up import FollowUpResult

FIRST_NAMES_MALE = [
    "Aarav", "Aditya", "Akhil", "Anirudh", "Arjun", "Bharat", "Chetan", "Darshan",
    "Deepak", "Devaraj", "Gautham", "Girish", "Harish", "Hemanth", "Ishaan", "Jayant",
    "Karthik", "Kiran", "Koushik", "Madhav", "Manoj", "Mohan", "Nikhil", "Nithin",
    "Pavan", "Pranav", "Prashant", "Praveen", "Rahul", "Rajesh", "Rakesh", "Rohan",
    "Rohit", "Sachin", "Sagar", "Sahil", "Sameer", "Sanjay", "Santosh", "Shashank",
    "Shreyas", "Siddharth", "Suhas", "Sumant", "Suraj", "Suresh", "Tarun", "Tejas",
    "Uday", "Varun", "Venkatesh", "Vignesh", "Vijay", "Vikram", "Vinay", "Vishal",
    "Vivek", "Yash", "Yashwant", "Yogesh", "Abhinav", "Adarsh", "Ajay", "Alok",
    "Amogh", "Anand", "Aniket", "Anup", "Arun", "Avinash"
]

FIRST_NAMES_FEMALE = [
    "Aditi", "Aishwarya", "Akshata", "Amrita", "Ananya", "Ankita", "Anusha", "Aparna",
    "Archana", "Bhavana", "Chaithra", "Chandana", "Deepa", "Deepika", "Divya", "Harshita",
    "Ishita", "Jyothi", "Kavya", "Keerthana", "Lavanya", "Madhuri", "Meghana", "Meera",
    "Nandini", "Navya", "Neha", "Niharika", "Nishita", "Pallavi", "Pooja", "Pragathi",
    "Prakruthi", "Prathiksha", "Priya", "Priyanka", "Rachana", "Rakshita", "Ramya", "Rashmi",
    "Rithika", "Sahana", "Sakshi", "Sangeetha", "Sanjana", "Shalini", "Shreya", "Sneha",
    "Spandana", "Spoorthi", "Swathi", "Tanvi", "Trisha", "Vaishnavi", "Varsha", "Veda",
    "Vidya", "Yamuna", "Anjali", "Bhoomika", "Bindu", "Chaya", "Geetha", "Kalyani",
    "Krithi", "Monika", "Namratha", "Pavitra", "Preethi", "Roshni"
]

LAST_NAMES = [
    "Acharya", "Adiga", "Bhat", "Bhatnagar", "Chandrashekar", "Deshpande", "Gowda", "Hegde",
    "Iyer", "Iyengar", "Jain", "Joshi", "Kamath", "Kulkarni", "Kumar", "Murthy",
    "Nadig", "Nair", "Nambiar", "Pai", "Patel", "Patil", "Prasad", "Raghavan",
    "Raj", "Rao", "Reddy", "Sastry", "Sharma", "Shetty", "Shinde", "Srinivas",
    "Suresh", "Varma", "Venkatesh", "Verma", "Holla", "Upadhyaya", "Achar", "Kashyap"
]


def _generate_student_names(count: int, seed_num: int) -> List[str]:
    """Generates unique deterministic Indian collegiate names."""
    rng = random.Random(seed_num)
    names = []
    used = set()
    while len(names) < count:
        if rng.random() < 0.5:
            first = rng.choice(FIRST_NAMES_MALE)
        else:
            first = rng.choice(FIRST_NAMES_FEMALE)
        last = rng.choice(LAST_NAMES)
        name = f"{first} {last}"
        if name not in used:
            used.add(name)
            names.append(name)
    return names


def seed_teacher_5_classes(teacher_id: int, db: Optional[Session] = None) -> Dict[str, Any]:
    """
    Seeds exactly 5 academic classes for the given teacher:
      Class 1: Sem 1 (70 students) - reconciled with existing Sem 1 class if present
      Class 2: Sem 3 (70 students)
      Class 3: Sem 5 (70 students)
      Class 4: Sem 5 (70 students)
      Class 5: Sem 7 (70 students)
    Total students: exactly 350.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        user = db.query(User).filter(User.id == teacher_id).first()
        if not user:
            raise ValueError(f"Teacher with ID {teacher_id} not found.")

        # Ensure teacher profile fields are populated
        if not user.institution:
            user.institution = "RV College of Engineering (RVCE)"
        if not user.department:
            user.department = "Computer Science & Engineering"
        if not user.designation:
            user.designation = "Assistant Professor"
        db.commit()

        # Class specifications
        class_specs = [
            {
                "sem": "Semester 1",
                "sem_short": "Sem 1",
                "code": "MAT211TC",
                "course_name": "Fundamentals of Linear Algebra and Calculus",
                "section": "C",
                "dept": "Computer Science & Engineering",
                "timetable": "Mon, Wed, Fri: 09:00 AM - 10:00 AM @ CS LH-101",
                "usn_prefix": "1RV25CS",
                "usn_start": 1,
                "topics": [
                    {
                        "name": "Eigenvalues, Eigenvectors & Diagonalization",
                        "desc": "Characteristic polynomial, algebraic vs geometric multiplicity, symmetric matrix diagonalization.",
                        "gap_evidence": "Unable to compute characteristic roots of 3x3 matrices; confused algebraic multiplicity with eigenspace dimension.",
                        "gap_strategy": "Guided matrix decomposition walkthrough and eigenspace visualization drill.",
                    },
                    {
                        "name": "Vector Spaces & Orthogonal Projections",
                        "desc": "Subspaces, linear independence, Gram-Schmidt orthogonalization, least-squares projection.",
                        "gap_evidence": "Errors in applying Gram-Schmidt orthonormalization; projection vector normalization omitted.",
                        "gap_strategy": "Pair practice on inner product computations and projection geometry worksheets.",
                    },
                    {
                        "name": "Multivariable Optimization & Gradients",
                        "desc": "Partial derivatives, Jacobian/Hessian matrices, saddle points, Lagrange multipliers.",
                        "gap_evidence": "Difficulty classifying critical points using Hessian determinant test.",
                        "gap_strategy": "Step-by-step Hessian determinant classification flowchart and practice problems.",
                    },
                ],
            },
            {
                "sem": "Semester 3",
                "sem_short": "Sem 3",
                "code": "22CS32",
                "course_name": "Data Structures & Applications",
                "section": "A",
                "dept": "Computer Science & Engineering",
                "timetable": "Mon, Wed, Fri: 10:15 AM - 11:15 AM @ CS LH-202",
                "usn_prefix": "1RV24CS",
                "usn_start": 1,
                "topics": [
                    {
                        "name": "Self-Balancing AVL Trees & Invariants",
                        "desc": "Balance factors, single and double rotations (LL, RR, LR, RL), height bounds.",
                        "gap_evidence": "Misidentified rotation pivots on double rotations (LR/RL) during insertion.",
                        "gap_strategy": "Interactive AVL tree rotation simulator and step-by-step rebalancing trace.",
                    },
                    {
                        "name": "Graph Traversal Algorithms (BFS & DFS)",
                        "desc": "Adjacency representations, queue/recursion traversal, topological ordering, cycle detection.",
                        "gap_evidence": "Confused discovery vs finishing times in DFS; failed cycle detection invariant check.",
                        "gap_strategy": "Color-coded trace of vertex states (white, grey, black) on directed graphs.",
                    },
                    {
                        "name": "Priority Queues & Binary Min-Heaps",
                        "desc": "Array representation, heapify-up and heapify-down procedures, heapsort complexity.",
                        "gap_evidence": "Incorrect parent-child index calculations in 0-indexed heap arrays; heapify violation.",
                        "gap_strategy": "Index arithmetic formula cheat sheet and hands-on heap array tracing.",
                    },
                ],
            },
            {
                "sem": "Semester 5",
                "sem_short": "Sem 5",
                "code": "22CS52",
                "course_name": "Analysis & Design of Algorithms",
                "section": "A",
                "dept": "Computer Science & Engineering",
                "timetable": "Tue, Thu: 09:00 AM - 10:30 AM @ CS Lab 3",
                "usn_prefix": "1RV23CS",
                "usn_start": 101,  # Start at 101 to avoid any collision with demo user's 001-012
                "topics": [
                    {
                        "name": "Dynamic Programming & Memoization",
                        "desc": "Optimal substructure, overlapping subproblems, 0/1 knapsack, Bellman-Ford, LCS.",
                        "gap_evidence": "Unable to define state transition recurrence relation; resorted to brute-force recursion.",
                        "gap_strategy": "Tabulation vs memoization template breakdown with grid-filling exercises.",
                    },
                    {
                        "name": "Greedy Spanning Trees (Prim & Kruskal)",
                        "desc": "Cut property, disjoint-set union-find with rank and path compression, min-heaps.",
                        "gap_evidence": "Improper union-find cycle check implementation resulting in undetected cycles.",
                        "gap_strategy": "Disjoint set union tree diagram walkthrough and dry-run cycle verification.",
                    },
                    {
                        "name": "Divide-and-Conquer Recurrences & Master Theorem",
                        "desc": "Master theorem three cases, substitution method, recursion tree analysis.",
                        "gap_evidence": "Misapplied Master Theorem when regularity condition was violated.",
                        "gap_strategy": "Recursion tree level summation practice and Master Theorem case classification quiz.",
                    },
                ],
            },
            {
                "sem": "Semester 5",
                "sem_short": "Sem 5",
                "code": "22IS53",
                "course_name": "Operating Systems & Concurrency",
                "section": "B",
                "dept": "Information Science & Engineering",
                "timetable": "Mon, Wed: 11:30 AM - 01:00 PM @ ISE Smart Hall 1",
                "usn_prefix": "1RV23IS",
                "usn_start": 1,
                "topics": [
                    {
                        "name": "Virtual Memory & Page Replacement",
                        "desc": "Demand paging, TLB reach, LRU, FIFO, Second-Chance algorithms, Belady anomaly.",
                        "gap_evidence": "Incorrectly computed page fault count under FIFO vs LRU with Belady's anomaly.",
                        "gap_strategy": "Physical page frame state trace table and reference string walkthrough.",
                    },
                    {
                        "name": "Process Synchronization & Deadlocks",
                        "desc": "Semaphores, mutex locks, producer-consumer problem, Banker's algorithm for avoidance.",
                        "gap_evidence": "Deadlock condition check failure in Banker's safety algorithm vector comparisons.",
                        "gap_strategy": "Banker's resource allocation matrix step-by-step state verification worksheets.",
                    },
                    {
                        "name": "CPU Scheduling & Multithreading",
                        "desc": "Preemptive vs non-preemptive SJF, Round-Robin quantum tuning, multilevel feedback queues.",
                        "gap_evidence": "Errors in computing turnaround time and waiting time in preemptive Round-Robin with context switches.",
                        "gap_strategy": "Gantt chart timeline construction drill with context-switch penalty calculation.",
                    },
                ],
            },
            {
                "sem": "Semester 7",
                "sem_short": "Sem 7",
                "code": "22CS71",
                "course_name": "Cloud Computing & Distributed Systems",
                "section": "A",
                "dept": "Computer Science & Engineering",
                "timetable": "Thu, Fri: 02:00 PM - 03:30 PM @ CS High-Performance Lab",
                "usn_prefix": "1RV22CS",
                "usn_start": 1,
                "topics": [
                    {
                        "name": "Distributed Consensus & Raft Protocol",
                        "desc": "Leader election, log replication, safety invariants, split-vote mitigation.",
                        "gap_evidence": "Misunderstood Raft leader commitment rule; allowed uncommitted log overwrite.",
                        "gap_strategy": "Visual Raft cluster state machine walkthrough and network partition simulation.",
                    },
                    {
                        "name": "Microservices & Container Orchestration",
                        "desc": "Docker container lifecycle, Kubernetes pod scheduling, service discovery, ingress routing.",
                        "gap_evidence": "Confused Kubernetes ClusterIP vs NodePort vs Ingress networking boundaries.",
                        "gap_strategy": "Network packet trace exercise through Kubernetes iptables and kube-proxy routing.",
                    },
                    {
                        "name": "Distributed Key-Value Stores & CAP Theorem",
                        "desc": "Consistent hashing, virtual nodes, vector clocks, tunable consistency (N, R, W).",
                        "gap_evidence": "Incorrect quorum consistency calculation: violated R + W > N condition.",
                        "gap_strategy": "Dynamo-style quorum consistency calculator exercises and partition scenario analysis.",
                    },
                ],
            },
        ]

        # 1. Reconcile or create the 5 classes
        created_or_found_classes = []

        # Check existing classes for teacher
        existing_classes = db.query(AcademicClass).filter(
            AcademicClass.teacher_id == teacher_id,
            AcademicClass.is_archived == False
        ).order_by(AcademicClass.id.asc()).all()

        for idx, spec in enumerate(class_specs):
            target_cls = None
            # Check if an existing class matches this semester and course code or section
            for ec in existing_classes:
                if ec not in created_or_found_classes:
                    if ec.semester == spec["sem"] and (ec.course_code == spec["code"] or ec.section == spec["section"]):
                        target_cls = ec
                        break

            # If not matched by exact code/section, match by semester if available
            if not target_cls:
                for ec in existing_classes:
                    if ec not in created_or_found_classes and ec.semester == spec["sem"]:
                        target_cls = ec
                        break

            # If still not found, create new class
            if not target_cls:
                display_name = f"{spec['dept'].split()[0]} {spec['sem_short']} Sec {spec['section']} ({spec['course_name']})"
                target_cls = AcademicClass(
                    teacher_id=teacher_id,
                    institution="RV College of Engineering (RVCE)",
                    department=spec["dept"],
                    academic_year="2025-2026",
                    semester=spec["sem"],
                    course_code=spec["code"],
                    course_name=spec["course_name"],
                    section=spec["section"],
                    name=display_name,
                    timetable_notes=spec["timetable"],
                    is_archived=False,
                )
                db.add(target_cls)
                db.commit()
                db.refresh(target_cls)
            else:
                # Update attributes to match standard collegiate spec
                target_cls.course_code = spec["code"]
                target_cls.course_name = spec["course_name"]
                target_cls.department = spec["dept"]
                target_cls.semester = spec["sem"]
                target_cls.section = spec["section"]
                if not target_cls.timetable_notes:
                    target_cls.timetable_notes = spec["timetable"]
                db.commit()
                db.refresh(target_cls)

            created_or_found_classes.append(target_cls)

        # 2. For each class, ensure exactly 70 students are enrolled
        STUDENTS_PER_CLASS = 70
        total_students_enrolled = 0
        now = datetime.now(timezone.utc)

        for idx, (cls, spec) in enumerate(zip(created_or_found_classes, class_specs)):
            existing_class_students = db.query(Student).filter(
                Student.teacher_id == teacher_id,
                Student.class_id == cls.id,
                Student.is_archived == False
            ).order_by(Student.student_id_code.asc()).all()

            existing_count = len(existing_class_students)
            needed = STUDENTS_PER_CLASS - existing_count

            # Generate names for students
            student_names = _generate_student_names(STUDENTS_PER_CLASS, seed_num=1000 + idx * 77)

            current_students = list(existing_class_students)

            if needed > 0:
                for i in range(needed):
                    num = spec["usn_start"] + existing_count + i
                    usn = f"{spec['usn_prefix']}{num:03d}"
                    name = student_names[existing_count + i]
                    clean_name = re.sub(r'[^a-z0-9]', '', name.lower())
                    year_tag = spec["usn_prefix"][3:5]
                    email = f"{clean_name}.cs{year_tag}@rvce.edu.in"

                    # Check if student with this USN exists for this teacher
                    existing_by_usn = db.query(Student).filter(
                        Student.student_id_code == usn,
                        Student.teacher_id == teacher_id
                    ).first()

                    if existing_by_usn:
                        existing_by_usn.class_id = cls.id
                        existing_by_usn.department = spec["dept"]
                        existing_by_usn.semester = spec["sem"]
                        existing_by_usn.grade_level = spec["sem"]
                        existing_by_usn.section = spec["section"]
                        existing_by_usn.is_archived = False
                        current_students.append(existing_by_usn)
                    else:
                        new_student = Student(
                            teacher_id=teacher_id,
                            class_id=cls.id,
                            student_id_code=usn,
                            full_name=name,
                            grade_level=spec["sem"],
                            section=spec["section"],
                            department=spec["dept"],
                            semester=spec["sem"],
                            email=email,
                            is_archived=False,
                        )
                        db.add(new_student)
                        current_students.append(new_student)

                db.commit()

            # Refresh list of students in class
            class_students = db.query(Student).filter(
                Student.teacher_id == teacher_id,
                Student.class_id == cls.id,
                Student.is_archived == False
            ).order_by(Student.student_id_code.asc()).all()

            total_students_enrolled += len(class_students)

            # 3. Create Topics for this class
            topic_objs = []
            for t_spec in spec["topics"]:
                topic = db.query(Topic).filter(
                    Topic.name == t_spec["name"],
                    Topic.course_code == spec["code"]
                ).first()
                if not topic:
                    topic = Topic(
                        subject=spec["course_name"],
                        name=t_spec["name"],
                        grade_level=spec["sem"],
                        semester=spec["sem"],
                        course_code=spec["code"],
                        description=t_spec["desc"],
                    )
                    db.add(topic)
                    db.commit()
                    db.refresh(topic)
                topic_objs.append((topic, t_spec))

            # 4. Create 2 Assessments for this class: CIE-1 and Quiz 1
            asm1 = db.query(Assessment).filter(
                Assessment.teacher_id == teacher_id,
                Assessment.class_id == cls.id,
                Assessment.title.like("CIE-1%")
            ).first()

            if not asm1:
                asm1 = Assessment(
                    teacher_id=teacher_id,
                    class_id=cls.id,
                    title=f"CIE-1: {spec['course_name']} Core Evaluations",
                    subject=spec["course_name"],
                    grade_level=spec["sem"],
                    semester=spec["sem"],
                    course_code=spec["code"],
                    assessment_type="cie_exam",
                    status="graded",
                    max_score=50.0,
                    passing_score=20.0,
                    duration_minutes=90,
                    description=f"Continuous Internal Evaluation 1 for {spec['course_name']}.",
                    assessment_date=now - timedelta(days=20),
                )
                db.add(asm1)
                db.commit()
                db.refresh(asm1)

            asm2 = db.query(Assessment).filter(
                Assessment.teacher_id == teacher_id,
                Assessment.class_id == cls.id,
                Assessment.title.like("Quiz 1%")
            ).first()

            if not asm2:
                sample_quiz = [
                    {
                        "id": "q1",
                        "question_text": f"Which fundamental property is verified during {topic_objs[0][0].name}?",
                        "question_type": "mcq",
                        "options": ["Conservation of state", "Invariant condition & termination", "Arbitrary mutation", "Non-deterministic recursion"],
                        "correct_answer": 1,
                        "marks": 5.0,
                        "explanation": "Invariant verification ensures algorithmic correctness and bounding constraints.",
                    },
                    {
                        "id": "q2",
                        "question_text": f"What is the optimal asymptotic time bound for {topic_objs[1][0].name}?",
                        "question_type": "mcq",
                        "options": ["O(N log N)", "O(N^2)", "O(2^N)", "O(N!)"],
                        "correct_answer": 0,
                        "marks": 5.0,
                        "explanation": "Standard balanced tree or divide-and-conquer implementation achieves O(N log N).",
                    },
                    {
                        "id": "q3",
                        "question_text": f"In {topic_objs[2][0].name}, how are boundary edge cases handled?",
                        "question_type": "mcq",
                        "options": ["Implicit error ignoring", "Explicit base case termination", "Unbounded stack recursion", "Dynamic casting"],
                        "correct_answer": 1,
                        "marks": 5.0,
                        "explanation": "Base cases prevent unbounded call frames and ensure convergence.",
                    },
                ]
                asm2 = Assessment(
                    teacher_id=teacher_id,
                    class_id=cls.id,
                    title=f"Quiz 1: {spec['topics'][0]['name']} Concepts",
                    subject=spec["course_name"],
                    grade_level=spec["sem"],
                    semester=spec["sem"],
                    course_code=spec["code"],
                    assessment_type="quiz",
                    status="graded",
                    max_score=15.0,
                    passing_score=6.0,
                    total_questions=3,
                    duration_minutes=25,
                    quiz_data=json.dumps(sample_quiz),
                    description="Formative continuous evaluation quiz.",
                    assessment_date=now - timedelta(days=7),
                )
                db.add(asm2)
                db.commit()
                db.refresh(asm2)

            # 5. Populate realistic student marks across CIE-1 and Quiz 1
            # Distribution: 20% high performers (>80%), 60% average (50-78%), 20% struggling (<45%)
            rng = random.Random(2026 + idx)
            struggling_students = []

            for s_idx, st in enumerate(class_students):
                # Deterministic bell curve
                seed_score = rng.random()
                if seed_score < 0.22:
                    # Struggling tier
                    pct1 = rng.uniform(28.0, 46.0)
                    pct2 = rng.uniform(30.0, 48.0)
                    struggling_students.append(st)
                elif seed_score < 0.80:
                    # Average tier
                    pct1 = rng.uniform(55.0, 78.0)
                    pct2 = rng.uniform(58.0, 80.0)
                else:
                    # High performer
                    pct1 = rng.uniform(82.0, 96.0)
                    pct2 = rng.uniform(85.0, 98.0)

                # CIE-1 score
                raw1 = round(pct1 / 100.0 * 50.0, 1)
                existing_sc1 = db.query(StudentAssessmentScore).filter(
                    StudentAssessmentScore.assessment_id == asm1.id,
                    StudentAssessmentScore.student_id == st.id
                ).first()
                if not existing_sc1:
                    sc1 = StudentAssessmentScore(
                        assessment_id=asm1.id,
                        student_id=st.id,
                        score=raw1,
                        percentage=round(pct1, 1),
                        recorded_at=now - timedelta(days=19),
                    )
                    db.add(sc1)

                # Quiz 1 score
                raw2 = round(pct2 / 100.0 * 15.0, 1)
                existing_sc2 = db.query(StudentAssessmentScore).filter(
                    StudentAssessmentScore.assessment_id == asm2.id,
                    StudentAssessmentScore.student_id == st.id
                ).first()
                if not existing_sc2:
                    sc2 = StudentAssessmentScore(
                        assessment_id=asm2.id,
                        student_id=st.id,
                        score=raw2,
                        percentage=round(pct2, 1),
                        recorded_at=now - timedelta(days=6),
                    )
                    db.add(sc2)

            db.commit()

            # 6. Generate Learning Gaps for 3-5 struggling students in this class
            for s_st in struggling_students[:4]:
                topic_item, t_data = rng.choice(topic_objs)
                existing_gap = db.query(LearningGap).filter(
                    LearningGap.student_id == s_st.id,
                    LearningGap.topic_id == topic_item.id,
                    LearningGap.teacher_id == teacher_id
                ).first()

                if not existing_gap:
                    severity = "critical" if rng.random() < 0.4 else "moderate"
                    gap = LearningGap(
                        student_id=s_st.id,
                        topic_id=topic_item.id,
                        severity=severity,
                        evidence=f"CIE-1 diagnostic evidence: {t_data['gap_evidence']} Score: below passing threshold.",
                        status="in_progress" if rng.random() < 0.6 else "active",
                        detected_at=now - timedelta(days=15),
                        teacher_id=teacher_id,
                    )
                    db.add(gap)
                    db.commit()
                    db.refresh(gap)

                    # 7. Create teacher-approved intervention for this gap
                    interv = Intervention(
                        student_id=s_st.id,
                        topic_id=topic_item.id,
                        learning_gap_id=gap.id,
                        title=f"Targeted Remediation: {topic_item.name}",
                        strategy_type="small_group_tutoring" if rng.random() < 0.5 else "guided_practice",
                        description=t_data["gap_strategy"],
                        status="in_progress",
                        teacher_approved=True,
                        created_at=now - timedelta(days=12),
                        teacher_id=teacher_id,
                    )
                    db.add(interv)
                    db.commit()
                    db.refresh(interv)

                    # 8. Follow-up result for the intervention
                    is_resolved = rng.random() < 0.5
                    outcome_status = "resolved" if is_resolved else "progressing"
                    follow_up = FollowUpResult(
                        intervention_id=interv.id,
                        outcome_status=outcome_status,
                        outcome_score=round(rng.uniform(72.0, 88.0) if is_resolved else rng.uniform(55.0, 68.0), 1),
                        observations=f"Follow-up check on {topic_item.name}: {'Demonstrated clear comprehension and resolved prior misconception.' if is_resolved else 'Progressing well; needs one more check on edge cases.'}",
                        recorded_at=now - timedelta(days=3),
                    )
                    db.add(follow_up)
                    db.commit()

        db.commit()

        # Summary of seeded classes
        seeded_classes = db.query(AcademicClass).filter(
            AcademicClass.teacher_id == teacher_id,
            AcademicClass.is_archived == False
        ).all()

        return {
            "status": "success",
            "teacher_id": teacher_id,
            "classes_count": len(seeded_classes),
            "total_students": total_students_enrolled,
            "classes": [
                {
                    "id": c.id,
                    "name": c.name,
                    "semester": c.semester,
                    "course_code": c.course_code,
                    "student_count": db.query(Student).filter(Student.class_id == c.id, Student.is_archived == False).count()
                }
                for c in seeded_classes
            ]
        }

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    import sys
    target_id = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    print(f"Seeding realistic 5-class RVCE dataset for teacher ID {target_id}...")
    res = seed_teacher_5_classes(target_id)
    print(json.dumps(res, indent=2))
