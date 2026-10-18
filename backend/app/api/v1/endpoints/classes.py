import csv
import io
import re
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.academic_class import AcademicClass
from app.models.student import Student
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.topic import LearningGap, Topic
from app.models.intervention import Intervention
from app.schemas.classes import (
    StudentSummary,
    StudentCreate,
    StudentUpdate,
    AcademicClassCreate,
    AcademicClassUpdate,
    ClassSectionResponse,
    ClassDetailResponse,
    CSVImportRequest,
    CSVImportResponse,
)

router = APIRouter()


def _format_class_name(department: str, semester: str, section: str, course_name: str) -> str:
    """Helper to auto-generate crisp institutional class display name."""
    dept_short = department
    if "Computer Science" in department:
        dept_short = "CSE"
    elif "Information Science" in department:
        dept_short = "ISE"
    elif "Artificial Intelligence" in department:
        dept_short = "AIML"
    elif "Electronics" in department:
        dept_short = "ECE"
    elif "Mechanical" in department:
        dept_short = "ME"

    sem_clean = semester.replace("Semester", "Sem").strip()
    return f"{dept_short} {sem_clean} Sec {section} ({course_name})"


@router.get(
    "",
    response_model=List[ClassSectionResponse],
    status_code=status.HTTP_200_OK,
    summary="List Classes",
    description="Returns academic classes and student rosters scoped to the authenticated teacher with filtering.",
)
def list_classes(
    include_archived: bool = Query(False, description="Include archived classes"),
    department: Optional[str] = Query(None, description="Filter by department"),
    semester: Optional[str] = Query(None, description="Filter by semester"),
    search: Optional[str] = Query(None, description="Search by class or course name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ClassSectionResponse]:
    query = db.query(AcademicClass).filter(AcademicClass.teacher_id == current_user.id)

    if not include_archived:
        query = query.filter(AcademicClass.is_archived == False)

    if department:
        query = query.filter(AcademicClass.department.ilike(f"%{department}%"))

    if semester:
        query = query.filter(AcademicClass.semester.ilike(f"%{semester}%"))

    if search:
        s = f"%{search}%"
        query = query.filter(
            (AcademicClass.name.ilike(s))
            | (AcademicClass.course_name.ilike(s))
            | (AcademicClass.course_code.ilike(s))
            | (AcademicClass.department.ilike(s))
        )

    classes = query.order_by(AcademicClass.created_at.desc()).all()

    # Fallback to dynamically grouped student sections if no AcademicClass records exist yet
    if not classes and not include_archived and not search and not department and not semester:
        student_sections = (
            db.query(Student.grade_level, Student.section)
            .filter(Student.teacher_id == current_user.id)
            .distinct()
            .order_by(Student.grade_level.asc(), Student.section.asc())
            .all()
        )
        if student_sections:
            fallback_results: List[ClassSectionResponse] = []
            for grade, sec in student_sections:
                st_list = (
                    db.query(Student)
                    .filter(
                        Student.teacher_id == current_user.id,
                        Student.grade_level == grade,
                        Student.section == sec,
                        Student.is_archived == False,
                    )
                    .order_by(Student.student_id_code.asc())
                    .all()
                )
                student_summaries = []
                scores_all = []
                active_gaps = 0
                for st in st_list:
                    scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.student_id == st.id).all()
                    avg_sc = None
                    if scores:
                        pcts = [s.percentage or (s.score / 50.0 * 100.0) for s in scores]
                        avg_sc = round(sum(pcts) / len(pcts), 1)
                        scores_all.extend(pcts)

                    gaps_cnt = (
                        db.query(LearningGap)
                        .filter(LearningGap.student_id == st.id, LearningGap.teacher_id == current_user.id, LearningGap.status != "resolved")
                        .count()
                    )
                    active_gaps += gaps_cnt
                    interv_cnt = (
                        db.query(Intervention)
                        .filter(Intervention.student_id == st.id, Intervention.teacher_id == current_user.id)
                        .count()
                    )
                    student_summaries.append(
                        StudentSummary(
                            id=st.id,
                            student_id_code=st.student_id_code,
                            full_name=st.full_name,
                            grade_level=st.grade_level,
                            section=st.section or "A",
                            department=st.department,
                            semester=st.semester,
                            email=st.email,
                            average_score=avg_sc,
                            gaps_count=gaps_cnt,
                            interventions_count=interv_cnt,
                            is_archived=st.is_archived,
                        )
                    )

                class_avg = round(sum(scores_all) / len(scores_all), 1) if scores_all else 75.0
                fallback_results.append(
                    ClassSectionResponse(
                        id=None,
                        class_name=f"{grade} - Section {sec}",
                        grade_level=grade,
                        section=sec,
                        subject="Science & Mathematics" if "9" in grade else "Advanced STEM",
                        institution="RV College of Engineering (RVCE)",
                        department="Computer Science & Engineering",
                        academic_year="2025-2026",
                        semester=grade,
                        course_code=None,
                        course_name="Curriculum Course",
                        timetable_notes=None,
                        student_count=len(st_list),
                        average_score_percent=class_avg,
                        active_gaps_count=active_gaps,
                        assessments_count=0,
                        is_archived=False,
                        students=student_summaries,
                    )
                )
            return fallback_results

    results: List[ClassSectionResponse] = []

    for cls in classes:
        # Fetch students linked to this class (or fallback to matching semester/section)
        students = (
            db.query(Student)
            .filter(
                Student.teacher_id == current_user.id,
                Student.is_archived == False,
                (Student.class_id == cls.id) | ((Student.class_id == None) & (Student.section == cls.section) & (Student.semester == cls.semester)),
            )
            .order_by(Student.student_id_code.asc())
            .all()
        )

        student_summaries: List[StudentSummary] = []
        class_scores = []
        active_gaps = 0

        for st in students:
            scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.student_id == st.id).all()
            avg_sc = None
            if scores:
                pcts = [s.percentage or (s.score / 50.0 * 100.0) for s in scores]
                avg_sc = round(sum(pcts) / len(pcts), 1)
                class_scores.extend(pcts)

            gaps_cnt = (
                db.query(LearningGap)
                .filter(LearningGap.student_id == st.id, LearningGap.teacher_id == current_user.id, LearningGap.status != "resolved")
                .count()
            )
            active_gaps += gaps_cnt
            interv_cnt = (
                db.query(Intervention)
                .filter(Intervention.student_id == st.id, Intervention.teacher_id == current_user.id)
                .count()
            )

            student_summaries.append(
                StudentSummary(
                    id=st.id,
                    student_id_code=st.student_id_code,
                    full_name=st.full_name,
                    grade_level=st.grade_level or cls.semester,
                    section=st.section or cls.section,
                    department=st.department or cls.department,
                    semester=st.semester or cls.semester,
                    email=st.email,
                    average_score=avg_sc,
                    gaps_count=gaps_cnt,
                    interventions_count=interv_cnt,
                    is_archived=st.is_archived,
                )
            )

        class_avg = round(sum(class_scores) / len(class_scores), 1) if class_scores else 75.0
        asm_count = db.query(Assessment).filter(Assessment.teacher_id == current_user.id, (Assessment.class_id == cls.id) | (Assessment.subject == cls.course_name)).count()

        results.append(
            ClassSectionResponse(
                id=cls.id,
                class_name=cls.name,
                grade_level=cls.semester,
                section=cls.section,
                subject=cls.course_name,
                institution=cls.institution,
                department=cls.department,
                academic_year=cls.academic_year,
                semester=cls.semester,
                course_code=cls.course_code,
                course_name=cls.course_name,
                timetable_notes=cls.timetable_notes,
                student_count=len(students),
                average_score_percent=class_avg,
                active_gaps_count=active_gaps,
                assessments_count=asm_count,
                is_archived=cls.is_archived,
                students=student_summaries,
            )
        )

    return results


@router.post(
    "",
    response_model=ClassSectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Academic Class",
    description="Creates a new RVCE college class or section for the authenticated teacher.",
)
def create_class(
    payload: AcademicClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClassSectionResponse:
    display_name = payload.name.strip() if payload.name and payload.name.strip() else _format_class_name(
        payload.department.strip(), payload.semester.strip(), payload.section.strip(), payload.course_name.strip()
    )

    new_class = AcademicClass(
        teacher_id=current_user.id,
        institution=payload.institution.strip() or "RV College of Engineering (RVCE)",
        department=payload.department.strip(),
        academic_year=payload.academic_year.strip() or "2025-2026",
        semester=payload.semester.strip(),
        course_code=payload.course_code.strip() if payload.course_code else None,
        course_name=payload.course_name.strip(),
        section=payload.section.strip() or "A",
        name=display_name,
        timetable_notes=payload.timetable_notes.strip() if payload.timetable_notes else None,
        is_archived=False,
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return ClassSectionResponse(
        id=new_class.id,
        class_name=new_class.name,
        grade_level=new_class.semester,
        section=new_class.section,
        subject=new_class.course_name,
        institution=new_class.institution,
        department=new_class.department,
        academic_year=new_class.academic_year,
        semester=new_class.semester,
        course_code=new_class.course_code,
        course_name=new_class.course_name,
        timetable_notes=new_class.timetable_notes,
        student_count=0,
        average_score_percent=75.0,
        active_gaps_count=0,
        assessments_count=0,
        is_archived=False,
        students=[],
    )


@router.get(
    "/{class_id}",
    response_model=ClassDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Class Detail View",
    description="Returns full class details, student roster, associated assessments, and learning gaps.",
)
def get_class_detail(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClassDetailResponse:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found or access denied.",
        )

    # 1. Enrolled students
    students = (
        db.query(Student)
        .filter(
            Student.teacher_id == current_user.id,
            Student.is_archived == False,
            (Student.class_id == cls.id) | ((Student.class_id == None) & (Student.section == cls.section) & (Student.semester == cls.semester)),
        )
        .order_by(Student.student_id_code.asc())
        .all()
    )

    student_summaries: List[StudentSummary] = []
    class_scores = []
    active_gaps_total = 0
    student_ids = [s.id for s in students]

    for st in students:
        scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.student_id == st.id).all()
        avg_sc = None
        if scores:
            pcts = [s.percentage or (s.score / 50.0 * 100.0) for s in scores]
            avg_sc = round(sum(pcts) / len(pcts), 1)
            class_scores.extend(pcts)

        gaps_cnt = (
            db.query(LearningGap)
            .filter(LearningGap.student_id == st.id, LearningGap.teacher_id == current_user.id, LearningGap.status != "resolved")
            .count()
        )
        active_gaps_total += gaps_cnt
        interv_cnt = (
            db.query(Intervention)
            .filter(Intervention.student_id == st.id, Intervention.teacher_id == current_user.id)
            .count()
        )

        student_summaries.append(
            StudentSummary(
                id=st.id,
                student_id_code=st.student_id_code,
                full_name=st.full_name,
                grade_level=st.grade_level or cls.semester,
                section=st.section or cls.section,
                department=st.department or cls.department,
                semester=st.semester or cls.semester,
                email=st.email,
                average_score=avg_sc,
                gaps_count=gaps_cnt,
                interventions_count=interv_cnt,
                is_archived=st.is_archived,
            )
        )

    # 2. Associated Assessments
    assessments_query = (
        db.query(Assessment)
        .filter(
            Assessment.teacher_id == current_user.id,
            (Assessment.class_id == cls.id) | (Assessment.subject == cls.course_name) | (Assessment.grade_level == cls.semester),
        )
        .order_by(Assessment.created_at.desc())
        .all()
    )

    assessment_items = []
    for asm in assessments_query:
        scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.assessment_id == asm.id).all()
        avg_pct = round(sum(s.percentage or (s.score / asm.max_score * 100.0) for s in scores) / len(scores), 1) if scores else 0.0
        assessment_items.append({
            "id": asm.id,
            "title": asm.title,
            "subject": asm.subject,
            "max_score": asm.max_score,
            "average_percent": avg_pct,
            "submissions_count": len(scores),
            "assessment_date": asm.assessment_date.strftime("%b %d, %Y") if asm.assessment_date else "Recently",
        })

    # 3. Learning gaps for students in this class
    gaps_items = []
    if student_ids:
        raw_gaps = (
            db.query(LearningGap, Topic, Student)
            .join(Topic, LearningGap.topic_id == Topic.id)
            .join(Student, LearningGap.student_id == Student.id)
            .filter(LearningGap.student_id.in_(student_ids), LearningGap.teacher_id == current_user.id)
            .order_by(LearningGap.detected_at.desc())
            .all()
        )
        for g, t, s in raw_gaps:
            gaps_items.append({
                "id": g.id,
                "topic_name": t.name,
                "severity": g.severity,
                "evidence": g.evidence,
                "status": g.status,
                "student_name": s.full_name,
                "student_id_code": s.student_id_code,
            })

    # 4. Interventions for students in this class
    interventions_items = []
    if student_ids:
        raw_interventions = (
            db.query(Intervention, Student)
            .join(Student, Intervention.student_id == Student.id)
            .filter(Intervention.student_id.in_(student_ids), Intervention.teacher_id == current_user.id)
            .order_by(Intervention.created_at.desc())
            .all()
        )
        for iv, s in raw_interventions:
            interventions_items.append({
                "id": iv.id,
                "title": iv.title,
                "strategy_type": iv.strategy_type,
                "teacher_approved": iv.teacher_approved,
                "student_name": s.full_name,
                "student_id_code": s.student_id_code,
                "created_at": iv.created_at.strftime("%b %d, %Y") if iv.created_at else "Recently",
            })

    class_avg = round(sum(class_scores) / len(class_scores), 1) if class_scores else 75.0

    return ClassDetailResponse(
        id=cls.id,
        name=cls.name,
        class_name=cls.name,
        institution=cls.institution,
        department=cls.department,
        academic_year=cls.academic_year,
        semester=cls.semester,
        grade_level=cls.semester,
        course_code=cls.course_code,
        course_name=cls.course_name,
        subject=cls.course_name,
        section=cls.section,
        timetable_notes=cls.timetable_notes,
        student_count=len(students),
        average_score_percent=class_avg,
        active_gaps_count=active_gaps_total,
        assessments_count=len(assessment_items),
        is_archived=cls.is_archived,
        students=student_summaries,
        assessments=assessment_items,
        learning_gaps=gaps_items,
        interventions=interventions_items,
    )


@router.put(
    "/{class_id}",
    response_model=ClassSectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Class",
    description="Updates academic class information (institution, department, course, timetable).",
)
def update_class(
    class_id: int,
    payload: AcademicClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClassSectionResponse:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found or access denied.",
        )

    if payload.institution is not None:
        cls.institution = payload.institution.strip()
    if payload.department is not None:
        cls.department = payload.department.strip()
    if payload.academic_year is not None:
        cls.academic_year = payload.academic_year.strip()
    if payload.semester is not None:
        cls.semester = payload.semester.strip()
    if payload.course_code is not None:
        cls.course_code = payload.course_code.strip()
    if payload.course_name is not None:
        cls.course_name = payload.course_name.strip()
    if payload.section is not None:
        cls.section = payload.section.strip()
    if payload.timetable_notes is not None:
        cls.timetable_notes = payload.timetable_notes.strip()
    if payload.is_archived is not None:
        cls.is_archived = payload.is_archived
    if payload.name is not None and payload.name.strip():
        cls.name = payload.name.strip()
    else:
        cls.name = _format_class_name(cls.department, cls.semester, cls.section, cls.course_name)

    db.commit()
    db.refresh(cls)

    student_count = db.query(Student).filter(Student.class_id == cls.id, Student.is_archived == False).count()
    return ClassSectionResponse(
        id=cls.id,
        class_name=cls.name,
        grade_level=cls.semester,
        section=cls.section,
        subject=cls.course_name,
        institution=cls.institution,
        department=cls.department,
        academic_year=cls.academic_year,
        semester=cls.semester,
        course_code=cls.course_code,
        course_name=cls.course_name,
        timetable_notes=cls.timetable_notes,
        student_count=student_count,
        average_score_percent=75.0,
        active_gaps_count=0,
        assessments_count=0,
        is_archived=cls.is_archived,
        students=[],
    )


@router.patch(
    "/{class_id}/archive",
    response_model=ClassSectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle Class Archive Status",
)
def toggle_class_archive(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClassSectionResponse:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found.",
        )

    cls.is_archived = not cls.is_archived
    db.commit()
    db.refresh(cls)

    return ClassSectionResponse(
        id=cls.id,
        class_name=cls.name,
        grade_level=cls.semester,
        section=cls.section,
        subject=cls.course_name,
        institution=cls.institution,
        department=cls.department,
        academic_year=cls.academic_year,
        semester=cls.semester,
        course_code=cls.course_code,
        course_name=cls.course_name,
        timetable_notes=cls.timetable_notes,
        student_count=0,
        average_score_percent=75.0,
        active_gaps_count=0,
        assessments_count=0,
        is_archived=cls.is_archived,
        students=[],
    )


@router.delete(
    "/{class_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete or Disassociate Class",
)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with ID {class_id} not found.",
        )

    # Disassociate enrolled students safely (preserves students and assessment histories)
    db.query(Student).filter(Student.class_id == cls.id).update({"class_id": None})
    db.query(Assessment).filter(Assessment.class_id == cls.id).update({"class_id": None})

    db.delete(cls)
    db.commit()

    return {"message": f"Class '{cls.name}' successfully removed.", "id": class_id}


# ==============================================================================
# Student Roster & Management Endpoints
# ==============================================================================

@router.get(
    "/{class_id}/students",
    response_model=List[StudentSummary],
    status_code=status.HTTP_200_OK,
    summary="List Students in Class",
)
def list_class_students(
    class_id: int,
    search: Optional[str] = Query(None, description="Search by name or USN"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[StudentSummary]:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    query = db.query(Student).filter(
        Student.teacher_id == current_user.id,
        Student.is_archived == False,
        (Student.class_id == cls.id) | ((Student.class_id == None) & (Student.section == cls.section) & (Student.semester == cls.semester)),
    )

    if search:
        s = f"%{search}%"
        query = query.filter((Student.full_name.ilike(s)) | (Student.student_id_code.ilike(s)))

    students = query.order_by(Student.student_id_code.asc()).all()

    summaries: List[StudentSummary] = []
    for st in students:
        scores = db.query(StudentAssessmentScore).filter(StudentAssessmentScore.student_id == st.id).all()
        avg_sc = round(sum(s.percentage or (s.score / 50.0 * 100.0) for s in scores) / len(scores), 1) if scores else None
        gaps_cnt = db.query(LearningGap).filter(LearningGap.student_id == st.id, LearningGap.status != "resolved").count()
        interv_cnt = db.query(Intervention).filter(Intervention.student_id == st.id).count()

        summaries.append(
            StudentSummary(
                id=st.id,
                student_id_code=st.student_id_code,
                full_name=st.full_name,
                grade_level=st.grade_level,
                section=st.section or "A",
                department=st.department,
                semester=st.semester,
                email=st.email,
                average_score=avg_sc,
                gaps_count=gaps_cnt,
                interventions_count=interv_cnt,
                is_archived=st.is_archived,
            )
        )

    return summaries


@router.post(
    "/{class_id}/students",
    response_model=StudentSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Add Student to Class Roster",
)
def add_student_to_class(
    class_id: int,
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentSummary:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    clean_code = payload.student_id_code.strip()
    existing = db.query(Student).filter(Student.student_id_code == clean_code, Student.teacher_id == current_user.id).first()
    if existing:
        if existing.class_id == cls.id and not existing.is_archived:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Student with USN / Roll No '{clean_code}' is already enrolled in this class.",
            )
        # If student exists but in another class or unassigned, associate with this class
        existing.class_id = cls.id
        existing.is_archived = False
        existing.department = cls.department
        existing.semester = cls.semester
        existing.section = cls.section
        if payload.email:
            existing.email = payload.email.strip()
        db.commit()
        db.refresh(existing)
        return StudentSummary(
            id=existing.id,
            student_id_code=existing.student_id_code,
            full_name=existing.full_name,
            grade_level=existing.grade_level,
            section=existing.section or "A",
            department=existing.department,
            semester=existing.semester,
            email=existing.email,
            average_score=None,
            gaps_count=0,
            interventions_count=0,
            is_archived=False,
        )

    new_student = Student(
        teacher_id=current_user.id,
        class_id=cls.id,
        student_id_code=clean_code,
        full_name=payload.full_name.strip(),
        grade_level=cls.semester,
        section=cls.section,
        department=cls.department,
        semester=cls.semester,
        email=payload.email.strip() if payload.email else f"{re.sub(r'[^a-z0-9]', '', payload.full_name.lower())}.cs23@rvce.edu.in",
        is_archived=False,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return StudentSummary(
        id=new_student.id,
        student_id_code=new_student.student_id_code,
        full_name=new_student.full_name,
        grade_level=new_student.grade_level,
        section=new_student.section or "A",
        department=new_student.department,
        semester=new_student.semester,
        email=new_student.email,
        average_score=None,
        gaps_count=0,
        interventions_count=0,
        is_archived=False,
    )


@router.post(
    "/students",
    response_model=StudentSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Add Student to Teacher Roster (Legacy Compatibility)",
)
def add_student_legacy(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentSummary:
    clean_code = payload.student_id_code.strip()
    existing = db.query(Student).filter(Student.student_id_code == clean_code, Student.teacher_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Student ID code '{clean_code}' already exists.",
        )

    new_student = Student(
        teacher_id=current_user.id,
        student_id_code=clean_code,
        full_name=payload.full_name.strip(),
        grade_level=payload.grade_level.strip() if payload.grade_level else "Semester 5",
        section=payload.section.strip() if payload.section else "A",
        department=payload.department.strip() if payload.department else "Computer Science & Engineering",
        semester=payload.semester.strip() if payload.semester else "Semester 5",
        email=payload.email.strip() if payload.email else None,
        is_archived=False,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return StudentSummary(
        id=new_student.id,
        student_id_code=new_student.student_id_code,
        full_name=new_student.full_name,
        grade_level=new_student.grade_level,
        section=new_student.section or "A",
        department=new_student.department,
        semester=new_student.semester,
        email=new_student.email,
        average_score=None,
        gaps_count=0,
        interventions_count=0,
        is_archived=False,
    )


@router.put(
    "/students/{student_id}",
    response_model=StudentSummary,
    status_code=status.HTTP_200_OK,
    summary="Update Student Academic Details",
)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentSummary:
    student = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or access denied.")

    if payload.full_name is not None and payload.full_name.strip():
        student.full_name = payload.full_name.strip()
    if payload.student_id_code is not None and payload.student_id_code.strip():
        new_code = payload.student_id_code.strip()
        # Check uniqueness
        duplicate = db.query(Student).filter(Student.student_id_code == new_code, Student.teacher_id == current_user.id, Student.id != student.id).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Roll number / USN '{new_code}' already in use.")
        student.student_id_code = new_code
    if payload.email is not None:
        student.email = payload.email.strip() or None
    if payload.department is not None:
        student.department = payload.department.strip()
    if payload.semester is not None:
        student.semester = payload.semester.strip()
        student.grade_level = payload.semester.strip()
    if payload.section is not None:
        student.section = payload.section.strip()

    db.commit()
    db.refresh(student)

    return StudentSummary(
        id=student.id,
        student_id_code=student.student_id_code,
        full_name=student.full_name,
        grade_level=student.grade_level,
        section=student.section or "A",
        department=student.department,
        semester=student.semester,
        email=student.email,
        average_score=None,
        gaps_count=0,
        interventions_count=0,
        is_archived=student.is_archived,
    )


@router.delete(
    "/students/{student_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove or Archive Student",
)
def remove_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    student = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or access denied.")

    # Disassociate from class and mark archived to preserve measurement histories safely
    student.is_archived = True
    student.class_id = None
    db.commit()

    return {"message": f"Student '{student.full_name}' ({student.student_id_code}) removed from active class roster.", "id": student_id}


# ==============================================================================
# CSV Batch Roster Import
# ==============================================================================

@router.get(
    "/{class_id}/students/csv-template",
    status_code=status.HTTP_200_OK,
    summary="Download or View Sample CSV Template",
)
def get_csv_template(class_id: int) -> Dict[str, Any]:
    sample_csv = "usn,name,email,department,semester,section\n" \
                 "1RV23CS001,Aditi Sharma,aditi.cs23@rvce.edu.in,Computer Science & Engineering,Semester 5,A\n" \
                 "1RV23CS002,Bharath Kumar,bharath.cs23@rvce.edu.in,Computer Science & Engineering,Semester 5,A\n" \
                 "1RV23CS003,Chaitra Hegde,chaitra.cs23@rvce.edu.in,Computer Science & Engineering,Semester 5,A\n"
    return {
        "headers": ["usn", "name", "email", "department", "semester", "section"],
        "sample_content": sample_csv,
        "instructions": "Ensure columns include at minimum 'usn' (or 'roll_no') and 'name' (or 'full_name'). Optional columns: email, department, semester, section.",
    }


@router.post(
    "/{class_id}/students/import-csv",
    response_model=CSVImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Import Students from CSV",
    description="Bulk enrolls students from CSV data with column auto-mapping, validation, and duplicate detection.",
)
def import_students_csv(
    class_id: int,
    payload: CSVImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CSVImportResponse:
    cls = db.query(AcademicClass).filter(AcademicClass.id == class_id, AcademicClass.teacher_id == current_user.id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    raw_text = payload.csv_content.strip()
    if not raw_text:
        return CSVImportResponse(
            total_rows=0,
            imported_count=0,
            updated_count=0,
            skipped_count=0,
            errors=["CSV payload is empty."],
            imported_students=[],
        )

    f = io.StringIO(raw_text)
    reader = csv.reader(f)

    headers = []
    if payload.has_headers:
        try:
            raw_headers = next(reader)
            headers = [h.strip().lower().replace(" ", "_") for h in raw_headers]
        except StopIteration:
            return CSVImportResponse(total_rows=0, imported_count=0, updated_count=0, skipped_count=0, errors=["Empty CSV header row."], imported_students=[])

    # Flexible column mapping
    usn_col = -1
    name_col = -1
    email_col = -1
    dept_col = -1
    sem_col = -1
    sec_col = -1

    for idx, h in enumerate(headers):
        if h in ("usn", "roll_no", "student_id", "id", "roll_number", "rollno"):
            usn_col = idx
        elif h in ("name", "full_name", "student_name", "student"):
            name_col = idx
        elif h in ("email", "student_email", "institutional_email"):
            email_col = idx
        elif h in ("department", "branch", "dept"):
            dept_col = idx
        elif h in ("semester", "sem"):
            sem_col = idx
        elif h in ("section", "sec"):
            sec_col = idx

    # If headers weren't named, default to standard positions: 0: USN, 1: Name, 2: Email
    if usn_col == -1:
        usn_col = 0
    if name_col == -1:
        name_col = 1
    if email_col == -1 and len(headers) > 2:
        email_col = 2

    total_rows = 0
    imported_count = 0
    updated_count = 0
    skipped_count = 0
    errors: List[str] = []
    imported_students: List[StudentSummary] = []
    seen_in_batch = set()

    for row_idx, row in enumerate(reader, start=2 if payload.has_headers else 1):
        if not row or all(not cell.strip() for cell in row):
            continue

        total_rows += 1

        if len(row) <= max(usn_col, name_col):
            errors.append(f"Row {row_idx}: Incomplete row, missing required USN or Name column.")
            skipped_count += 1
            continue

        raw_usn = row[usn_col].strip().upper()
        raw_name = row[name_col].strip()
        raw_email = row[email_col].strip() if email_col != -1 and len(row) > email_col else None
        raw_dept = row[dept_col].strip() if dept_col != -1 and len(row) > dept_col else cls.department
        raw_sem = row[sem_col].strip() if sem_col != -1 and len(row) > sem_col else cls.semester
        raw_sec = row[sec_col].strip() if sec_col != -1 and len(row) > sec_col else cls.section

        if not raw_usn or not raw_name:
            errors.append(f"Row {row_idx}: USN/Roll Number and Full Name cannot be empty.")
            skipped_count += 1
            continue

        # Check duplicate within this batch
        if raw_usn in seen_in_batch:
            errors.append(f"Row {row_idx}: Duplicate USN '{raw_usn}' within the same CSV file.")
            skipped_count += 1
            continue
        seen_in_batch.add(raw_usn)

        # Check against database
        existing = db.query(Student).filter(Student.student_id_code == raw_usn, Student.teacher_id == current_user.id).first()
        if existing:
            # Update existing student's class association
            existing.class_id = cls.id
            existing.full_name = raw_name
            existing.is_archived = False
            existing.department = raw_dept or cls.department
            existing.semester = raw_sem or cls.semester
            existing.section = raw_sec or cls.section
            if raw_email:
                existing.email = raw_email
            db.commit()
            db.refresh(existing)
            updated_count += 1
            imported_students.append(
                StudentSummary(
                    id=existing.id,
                    student_id_code=existing.student_id_code,
                    full_name=existing.full_name,
                    grade_level=existing.grade_level,
                    section=existing.section or "A",
                    department=existing.department,
                    semester=existing.semester,
                    email=existing.email,
                    average_score=None,
                    gaps_count=0,
                    interventions_count=0,
                    is_archived=False,
                )
            )
        else:
            # Create new student
            auto_email = raw_email or f"{re.sub(r'[^a-z0-9]', '', raw_name.lower())}.cs23@rvce.edu.in"
            new_student = Student(
                teacher_id=current_user.id,
                class_id=cls.id,
                student_id_code=raw_usn,
                full_name=raw_name,
                grade_level=raw_sem or cls.semester,
                section=raw_sec or cls.section,
                department=raw_dept or cls.department,
                semester=raw_sem or cls.semester,
                email=auto_email,
                is_archived=False,
            )
            db.add(new_student)
            db.commit()
            db.refresh(new_student)
            imported_count += 1
            imported_students.append(
                StudentSummary(
                    id=new_student.id,
                    student_id_code=new_student.student_id_code,
                    full_name=new_student.full_name,
                    grade_level=new_student.grade_level,
                    section=new_student.section or "A",
                    department=new_student.department,
                    semester=new_student.semester,
                    email=new_student.email,
                    average_score=None,
                    gaps_count=0,
                    interventions_count=0,
                    is_archived=False,
                )
            )

    return CSVImportResponse(
        total_rows=total_rows,
        imported_count=imported_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        errors=errors,
        imported_students=imported_students,
    )
