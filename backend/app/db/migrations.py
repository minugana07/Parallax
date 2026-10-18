"""
Safe, non-destructive SQLite schema migration and data integrity module.
Preserves existing records while ensuring:
1. Teacher ownership columns (teacher_id) across all core entities.
2. Academic class entity and student/assessment class_id associations.
3. College-level fields (department, semester, email, is_archived) for RVCE institutional workflows.
4. Seamless demo dataset enhancement without data loss or dropping tables.
"""
import logging
import re
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from app.db.session import engine, SessionLocal, Base
from app.models.user import User
from app.models.academic_class import AcademicClass
from app.models.student import Student
from app.models.assessment import Assessment
from app.core.security import hash_password

logger = logging.getLogger(__name__)

DEMO_TEACHER_EMAIL = "demo.teacher@parallax.edu"
DEMO_TEACHER_NAME = "Prof. Priya Sharma"
DEMO_TEACHER_DEFAULT_PW = "DemoTeacher2026!"


def run_safe_migrations() -> None:
    """
    Safely creates new tables and adds missing columns without dropping or corrupting existing data.
    """
    # 1. Create any missing tables (e.g. users, user_sessions, classes)
    Base.metadata.create_all(bind=engine)

    # 2. Check and add missing columns to existing tables
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Check teacher_id on core tables
        tables_needing_teacher_id = ["students", "assessments", "learning_gaps", "interventions", "classes"]
        for tbl in tables_needing_teacher_id:
            if tbl in inspector.get_table_names():
                existing_cols = [c["name"] for c in inspector.get_columns(tbl)]
                if "teacher_id" not in existing_cols:
                    logger.info(f"Adding teacher_id column to {tbl} table...")
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN teacher_id INTEGER REFERENCES users(id);"))

        # Check college fields on students
        if "students" in inspector.get_table_names():
            student_cols = [c["name"] for c in inspector.get_columns("students")]
            if "class_id" not in student_cols:
                logger.info("Adding class_id column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN class_id INTEGER REFERENCES classes(id);"))
            if "department" not in student_cols:
                logger.info("Adding department column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN department VARCHAR(100);"))
            if "semester" not in student_cols:
                logger.info("Adding semester column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN semester VARCHAR(50);"))
            if "email" not in student_cols:
                logger.info("Adding email column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN email VARCHAR(120);"))
            if "is_archived" not in student_cols:
                logger.info("Adding is_archived column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN is_archived BOOLEAN DEFAULT 0;"))

        # Check college & quiz fields on assessments
        if "assessments" in inspector.get_table_names():
            assessment_cols = [c["name"] for c in inspector.get_columns("assessments")]
            if "class_id" not in assessment_cols:
                logger.info("Adding class_id column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN class_id INTEGER REFERENCES classes(id);"))
            if "assessment_type" not in assessment_cols:
                logger.info("Adding assessment_type column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN assessment_type VARCHAR(50) DEFAULT 'cie_exam';"))
            if "status" not in assessment_cols:
                logger.info("Adding status column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN status VARCHAR(50) DEFAULT 'graded';"))
            if "description" not in assessment_cols:
                logger.info("Adding description column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN description TEXT;"))
            if "duration_minutes" not in assessment_cols:
                logger.info("Adding duration_minutes column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN duration_minutes INTEGER;"))
            if "passing_score" not in assessment_cols:
                logger.info("Adding passing_score column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN passing_score FLOAT DEFAULT 40.0;"))
            if "course_code" not in assessment_cols:
                logger.info("Adding course_code column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN course_code VARCHAR(50);"))
            if "semester" not in assessment_cols:
                logger.info("Adding semester column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN semester VARCHAR(50);"))
            if "total_questions" not in assessment_cols:
                logger.info("Adding total_questions column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN total_questions INTEGER DEFAULT 0;"))
            if "quiz_data" not in assessment_cols:
                logger.info("Adding quiz_data column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN quiz_data TEXT;"))

        # Check question_scores on student_assessment_scores
        if "student_assessment_scores" in inspector.get_table_names():
            score_cols = [c["name"] for c in inspector.get_columns("student_assessment_scores")]
            if "question_scores" not in score_cols:
                logger.info("Adding question_scores column to student_assessment_scores table...")
                conn.execute(text("ALTER TABLE student_assessment_scores ADD COLUMN question_scores TEXT;"))

        # Check course_code and semester on topics
        if "topics" in inspector.get_table_names():
            topic_cols = [c["name"] for c in inspector.get_columns("topics")]
            if "course_code" not in topic_cols:
                logger.info("Adding course_code column to topics table...")
                conn.execute(text("ALTER TABLE topics ADD COLUMN course_code VARCHAR(50);"))
            if "semester" not in topic_cols:
                logger.info("Adding semester column to topics table...")
                conn.execute(text("ALTER TABLE topics ADD COLUMN semester VARCHAR(50);"))

        # Check institution, department, designation on users table
        if "users" in inspector.get_table_names():
            user_cols = [c["name"] for c in inspector.get_columns("users")]
            if "institution" not in user_cols:
                logger.info("Adding institution column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN institution VARCHAR(200) DEFAULT 'RV College of Engineering (RVCE)';"))
            if "department" not in user_cols:
                logger.info("Adding department column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(200) DEFAULT 'Computer Science & Engineering';"))
            if "designation" not in user_cols:
                logger.info("Adding designation column to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN designation VARCHAR(100) DEFAULT 'Assistant Professor';"))

    # 3. Ensure Demo Teacher exists and enhance demo records with RVCE classes
    db: Session = SessionLocal()
    try:
        demo_user = db.query(User).filter(User.email == DEMO_TEACHER_EMAIL).first()
        if not demo_user:
            demo_user = User(
                email=DEMO_TEACHER_EMAIL,
                full_name=DEMO_TEACHER_NAME,
                hashed_password=hash_password(DEMO_TEACHER_DEFAULT_PW),
                is_active=True,
                is_demo=True,
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            logger.info(f"Created official Demo Teacher account: {demo_user.email} (ID: {demo_user.id})")

        # Assign existing orphaned demo data to demo teacher
        with engine.begin() as conn:
            for tbl in tables_needing_teacher_id:
                if tbl in inspector.get_table_names():
                    conn.execute(
                        text(f"UPDATE {tbl} SET teacher_id = :uid WHERE teacher_id IS NULL;"),
                        {"uid": demo_user.id},
                    )

        # 4. Ensure RVCE College classes exist for Demo Teacher
        demo_classes_count = db.query(AcademicClass).filter(AcademicClass.teacher_id == demo_user.id).count()
        if demo_classes_count == 0:
            logger.info("Creating initial RVCE college classes for Demo Teacher...")
            rvce_classes = [
                AcademicClass(
                    teacher_id=demo_user.id,
                    institution="RV College of Engineering (RVCE)",
                    department="Computer Science & Engineering",
                    academic_year="2025-2026",
                    semester="Semester 5",
                    course_code="22CS52",
                    course_name="Data Structures & Algorithms",
                    section="A",
                    name="RVCE - CSE Sem 5 Sec A (DSA)",
                    timetable_notes="Mon, Wed, Fri: 09:00 AM - 10:00 AM @ CS Lab 3",
                    is_archived=False,
                ),
                AcademicClass(
                    teacher_id=demo_user.id,
                    institution="RV College of Engineering (RVCE)",
                    department="Computer Science & Engineering",
                    academic_year="2025-2026",
                    semester="Semester 5",
                    course_code="22CS53",
                    course_name="Operating Systems",
                    section="B",
                    name="RVCE - CSE Sem 5 Sec B (OS)",
                    timetable_notes="Tue, Thu: 10:15 AM - 11:45 AM @ CS Seminar Hall",
                    is_archived=False,
                ),
                AcademicClass(
                    teacher_id=demo_user.id,
                    institution="RV College of Engineering (RVCE)",
                    department="Information Science & Engineering",
                    academic_year="2025-2026",
                    semester="Semester 3",
                    course_code="22IS32",
                    course_name="Object-Oriented Programming",
                    section="A",
                    name="RVCE - ISE Sem 3 Sec A (OOP)",
                    timetable_notes="Mon, Wed: 02:00 PM - 03:30 PM @ ISE Smart Room 1",
                    is_archived=False,
                ),
                AcademicClass(
                    teacher_id=demo_user.id,
                    institution="RV College of Engineering (RVCE)",
                    department="Artificial Intelligence & Machine Learning",
                    academic_year="2025-2026",
                    semester="Semester 6",
                    course_code="22AI61",
                    course_name="Machine Learning & Neural Networks",
                    section="A",
                    name="RVCE - AIML Sem 6 Sec A (ML)",
                    timetable_notes="Fri: 11:15 AM - 01:15 PM @ AI Research Lab",
                    is_archived=False,
                ),
            ]
            db.add_all(rvce_classes)
            db.commit()

        # Link demo students to RVCE classes, populate academic fields, and migrate to College USNs
        c_list = db.query(AcademicClass).filter(AcademicClass.teacher_id == demo_user.id).order_by(AcademicClass.id.asc()).all()
        if c_list and len(c_list) >= 4:
            usn_map = {
                "STU-101": "1RV23CS001",
                "STU-102": "1RV23CS002",
                "STU-103": "1RV23CS003",
                "STU-104": "1RV23CS004",
                "STU-105": "1RV23CS005",
                "STU-106": "1RV23CS006",
                "STU-107": "1RV23CS007",
                "STU-108": "1RV23CS008",
                "STU-109": "1RV23CS009",
                "STU-110": "1RV23CS010",
                "STU-111": "1RV23CS011",
                "STU-112": "1RV23CS012",
                "STU-201": "1RV24IS001",
                "STU-202": "1RV24IS002",
                "STU-203": "1RV24IS003",
                "STU-204": "1RV24IS004",
                "STU-205": "1RV24IS005",
                "STU-206": "1RV24IS006",
                "STU-207": "1RV24IS007",
                "STU-208": "1RV24IS008",
                "STU-209": "1RV24IS009",
                "STU-210": "1RV24IS010",
                "STU-211": "1RV24IS011",
                "STU-212": "1RV24IS012",
            }
            demo_students = db.query(Student).filter(Student.teacher_id == demo_user.id).all()
            for s in demo_students:
                if s.student_id_code in usn_map:
                    s.student_id_code = usn_map[s.student_id_code]

                # Map based on existing grade/section or assign sequentially
                target_class = c_list[0]
                if s.section == "B" and "9" in str(s.grade_level):
                    target_class = c_list[1]
                elif s.section == "A" and "10" in str(s.grade_level):
                    target_class = c_list[2]
                elif s.section == "B" and "10" in str(s.grade_level):
                    target_class = c_list[3]

                s.class_id = target_class.id
                s.department = target_class.department
                s.semester = target_class.semester
                s.section = target_class.section

                # Normalize clean RVCE institutional email if missing
                if not s.email or "@rvce.edu.in" not in s.email:
                    clean_name = re.sub(r'[^a-z0-9]', '', s.full_name.lower())
                    s.email = f"{clean_name}.cs23@rvce.edu.in"
            db.commit()

            # Link existing demo assessments to matching classes
            demo_assessments = db.query(Assessment).filter(Assessment.teacher_id == demo_user.id).all()
            for asm in demo_assessments:
                if not asm.class_id:
                    if "9" in str(asm.grade_level):
                        asm.class_id = c_list[0].id
                    else:
                        asm.class_id = c_list[2].id

            # College-level curriculum normalization for Demo Teacher only (never modify real user records)
            with engine.begin() as conn:
                # Update demo students to college semesters and department
                conn.execute(
                    text("UPDATE students SET grade_level = 'Semester 5', semester = 'Semester 5' WHERE teacher_id = :uid AND grade_level LIKE '%Grade 9%';"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE students SET grade_level = 'Semester 3', semester = 'Semester 3' WHERE teacher_id = :uid AND grade_level LIKE '%Grade 10%';"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE students SET semester = grade_level WHERE teacher_id = :uid AND semester IS NULL;"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE students SET department = 'Computer Science & Engineering' WHERE teacher_id = :uid AND department IS NULL;"),
                    {"uid": demo_user.id},
                )

                # Update demo assessments to college continuous evaluation and lab formats
                conn.execute(
                    text("UPDATE assessments SET title = 'CIE-1: Graph Algorithms & Spanning Trees', subject = 'Data Structures & Algorithms', grade_level = 'Semester 5', semester = 'Semester 5', course_code = '22CS52', assessment_type = 'cie_exam', status = 'graded', passing_score = 20.0 WHERE teacher_id = :uid AND (title LIKE '%Diagnostic 1%' OR title LIKE '%Factoring%');"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE assessments SET title = 'Lab Assessment 1: Process Scheduling & Threads', subject = 'Operating Systems', grade_level = 'Semester 5', semester = 'Semester 5', course_code = '22CS53', assessment_type = 'lab_test', status = 'graded', passing_score = 40.0 WHERE teacher_id = :uid AND (title LIKE '%Unit 2%' OR title LIKE '%Newton%');"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE assessments SET title = 'Online Quiz 1: Dynamic Programming Concepts', subject = 'Data Structures & Algorithms', grade_level = 'Semester 5', semester = 'Semester 5', course_code = '22CS52', assessment_type = 'quiz', status = 'graded', total_questions = 3, duration_minutes = 20, passing_score = 16.0 WHERE teacher_id = :uid AND (title LIKE '%Quiz%' OR title LIKE '%Linear%');"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE assessments SET title = 'CIE-2: Virtual Memory & Page Replacement', subject = 'Operating Systems', grade_level = 'Semester 5', semester = 'Semester 5', course_code = '22CS53', assessment_type = 'cie_exam', status = 'graded', passing_score = 20.0 WHERE teacher_id = :uid AND (title LIKE '%Diagnostic 2%' OR title LIKE '%Cellular%');"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE assessments SET title = 'Midterm: Relational Schema & Normalization', subject = 'Database Management', grade_level = 'Semester 3', semester = 'Semester 3', course_code = '22IS32', assessment_type = 'midterm', status = 'graded', passing_score = 40.0 WHERE teacher_id = :uid AND (title LIKE '%Mid-Term%' OR title LIKE '%Coordinate%');"),
                    {"uid": demo_user.id},
                )
                conn.execute(
                    text("UPDATE assessments SET title = 'Quiz 2: Transaction Management & ACID', subject = 'Database Management', grade_level = 'Semester 3', semester = 'Semester 3', course_code = '22IS32', assessment_type = 'quiz', status = 'graded', total_questions = 3, duration_minutes = 25, passing_score = 24.0 WHERE teacher_id = :uid AND (title LIKE '%Mastery%' OR title LIKE '%Circuit%');"),
                    {"uid": demo_user.id},
                )

            # Populate sample authored questions on quiz assessments if missing
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
            quiz_asms = db.query(Assessment).filter(Assessment.assessment_type == 'quiz').all()
            for q_asm in quiz_asms:
                if not q_asm.quiz_data:
                    q_asm.quiz_data = json.dumps(sample_quiz_questions)
                    q_asm.total_questions = len(sample_quiz_questions)

            db.commit()

    finally:
        db.close()
