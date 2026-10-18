from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.deps import get_current_user
from app.models.student import Student
from app.schemas.classes import StudentSummary, StudentUpdate

router = APIRouter()


@router.get(
    "/{student_id}",
    response_model=StudentSummary,
    status_code=status.HTTP_200_OK,
    summary="Get Student Details",
)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentSummary:
    student = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or access denied.")

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


@router.put(
    "/{student_id}",
    response_model=StudentSummary,
    status_code=status.HTTP_200_OK,
    summary="Update Student Academic Details",
)
def update_student_details(
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
        new_code = payload.student_id_code.strip().upper()
        duplicate = db.query(Student).filter(
            Student.student_id_code == new_code,
            Student.teacher_id == current_user.id,
            Student.id != student.id
        ).first()
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
    "/{student_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove or Archive Student",
)
def remove_student_record(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    student = db.query(Student).filter(Student.id == student_id, Student.teacher_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found or access denied.")

    student.is_archived = True
    student.class_id = None
    db.commit()

    return {"message": f"Student '{student.full_name}' ({student.student_id_code}) removed from class roster.", "id": student_id}
