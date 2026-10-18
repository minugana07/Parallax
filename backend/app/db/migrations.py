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

        # Check class_id on assessments
        if "assessments" in inspector.get_table_names():
            assessment_cols = [c["name"] for c in inspector.get_columns("assessments")]
            if "class_id" not in assessment_cols:
                logger.info("Adding class_id column to assessments table...")
                conn.execute(text("ALTER TABLE assessments ADD COLUMN class_id INTEGER REFERENCES classes(id);"))

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

        # Link demo students to RVCE classes and populate academic fields
        c_list = db.query(AcademicClass).filter(AcademicClass.teacher_id == demo_user.id).order_by(AcademicClass.id.asc()).all()
        if c_list and len(c_list) >= 4:
            demo_students = db.query(Student).filter(Student.teacher_id == demo_user.id).all()
            for s in demo_students:
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
                if not s.email:
                    clean_name = re.sub(r'[^a-z0-9]', '', s.full_name.lower())
                    s.email = f"{clean_name}.cs23@rvce.edu.in"

            # Link existing demo assessments to matching classes
            demo_assessments = db.query(Assessment).filter(Assessment.teacher_id == demo_user.id).all()
            for asm in demo_assessments:
                if not asm.class_id:
                    if "9" in asm.grade_level:
                        asm.class_id = c_list[0].id
                    else:
                        asm.class_id = c_list[2].id

            db.commit()

    finally:
        db.close()
