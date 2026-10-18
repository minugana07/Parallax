"""
Tests for RVCE College Academic Class Management, Student Rosters, CSV Import, and Isolation.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_and_manage_rvce_class():
    """Verify creating, viewing, editing, and archiving an RVCE college class."""
    # 1. Login as demo teacher
    login_res = client.post("/api/v1/auth/demo-login")
    assert login_res.status_code == 200

    # 2. Create new RVCE course section
    new_class_payload = {
        "institution": "RV College of Engineering (RVCE)",
        "department": "Computer Science & Engineering",
        "academic_year": "2025-2026",
        "semester": "Semester 5",
        "course_code": "22CS52",
        "course_name": "Analysis & Design of Algorithms",
        "section": "C",
        "timetable_notes": "Tue, Thu: 09:00 AM - 10:30 AM @ CS Lab 4",
    }
    create_res = client.post("/api/v1/classes", json=new_class_payload)
    assert create_res.status_code == 201
    created_class = create_res.json()
    assert created_class["id"] is not None
    assert created_class["course_code"] == "22CS52"
    assert created_class["institution"] == "RV College of Engineering (RVCE)"
    class_id = created_class["id"]

    # 3. View class detail
    detail_res = client.get(f"/api/v1/classes/{class_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == class_id
    assert detail["student_count"] == 0
    assert detail["is_archived"] is False

    # 4. Edit class
    update_payload = {
        "timetable_notes": "Updated: Tue, Thu: 10:00 AM - 11:30 AM @ CS Seminar Hall 2",
        "section": "C1",
    }
    update_res = client.put(f"/api/v1/classes/{class_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["section"] == "C1"
    assert "CS Seminar Hall 2" in updated["timetable_notes"]

    # 5. Archive class
    archive_res = client.patch(f"/api/v1/classes/{class_id}/archive")
    assert archive_res.status_code == 200
    assert archive_res.json()["is_archived"] is True

    # 6. Unarchive class
    unarchive_res = client.patch(f"/api/v1/classes/{class_id}/archive")
    assert unarchive_res.status_code == 200
    assert unarchive_res.json()["is_archived"] is False


def test_student_management_and_csv_import():
    """Verify adding students manually, updating, CSV batch import, and safe removal."""
    # 1. Login
    client.post("/api/v1/auth/demo-login")

    # 2. Create a target class for testing
    cls_payload = {
        "institution": "RV College of Engineering (RVCE)",
        "department": "Information Science & Engineering",
        "academic_year": "2025-2026",
        "semester": "Semester 4",
        "course_code": "22IS41",
        "course_name": "Database Management Systems",
        "section": "A",
    }
    c_res = client.post("/api/v1/classes", json=cls_payload)
    class_id = c_res.json()["id"]

    # 3. Add single student with RVCE USN
    import uuid
    uid_suffix = uuid.uuid4().hex[:4].upper()
    usn1 = f"1RV23IS{uid_suffix}1"
    usn2 = f"1RV23IS{uid_suffix}2"
    usn3 = f"1RV23IS{uid_suffix}3"

    student_payload = {
        "student_id_code": usn1,
        "full_name": "Deepak Natarajan",
        "email": f"deepak.{uid_suffix}@rvce.edu.in",
    }
    add_res = client.post(f"/api/v1/classes/{class_id}/students", json=student_payload)
    assert add_res.status_code == 201
    stu = add_res.json()
    assert stu["student_id_code"] == usn1
    student_id = stu["id"]

    # 4. Edit student details
    edit_payload = {
        "full_name": "Deepak N. Rao",
        "email": f"deepak.rao.{uid_suffix}@rvce.edu.in",
    }
    edit_res = client.put(f"/api/v1/students/{student_id}", json=edit_payload)
    assert edit_res.status_code == 200
    assert edit_res.json()["full_name"] == "Deepak N. Rao"

    # 5. CSV Batch Import
    csv_text = (
        "usn,name,email,department,semester,section\n"
        f"{usn2},Meera Nambiar,meera.{uid_suffix}@rvce.edu.in,ISE,Semester 4,A\n"
        f"{usn3},Nikhil Gowda,nikhil.{uid_suffix}@rvce.edu.in,ISE,Semester 4,A\n"
        f"{usn2},Duplicate Meera,duplicate@rvce.edu.in,ISE,Semester 4,A\n"  # Duplicate within CSV
        ",Unnamed Student,bad@rvce.edu.in,ISE,Semester 4,A\n"  # Missing USN
    )
    import_res = client.post(
        f"/api/v1/classes/{class_id}/students/import-csv",
        json={"csv_content": csv_text, "has_headers": True},
    )
    assert import_res.status_code == 200
    imp_data = import_res.json()
    assert imp_data["imported_count"] == 2  # usn2 and usn3
    assert imp_data["skipped_count"] == 2   # 1 duplicate + 1 missing USN
    assert len(imp_data["errors"]) >= 2

    # 6. Verify roster count in class detail
    detail_res = client.get(f"/api/v1/classes/{class_id}")
    detail = detail_res.json()
    # 1 manual student + 2 imported students = 3 students total
    assert detail["student_count"] == 3

    # 7. Safe removal of student
    remove_res = client.delete(f"/api/v1/students/{student_id}")
    assert remove_res.status_code == 200

    # Verify student is removed from active roster
    detail_after = client.get(f"/api/v1/classes/{class_id}").json()
    assert detail_after["student_count"] == 2


def test_rvce_classes_multi_teacher_isolation():
    """Verify that Teacher B cannot access or modify Teacher A's RVCE classes."""
    # 1. Register Teacher A
    t1_email = "prof.sharma@rvce.edu.in"
    client.post("/api/v1/auth/register", json={
        "email": t1_email,
        "password": "Password123!@#",
        "full_name": "Prof. S. Sharma",
    })
    client.post("/api/v1/auth/login", json={"email": t1_email, "password": "Password123!@#"})

    # Teacher A creates an ECE class
    t1_class = client.post("/api/v1/classes", json={
        "institution": "RV College of Engineering (RVCE)",
        "department": "Electronics & Communication Engineering",
        "academic_year": "2025-2026",
        "semester": "Semester 6",
        "course_code": "22EC61",
        "course_name": "Digital Signal Processing",
        "section": "A",
    }).json()
    t1_class_id = t1_class["id"]

    # 2. Register Teacher B
    t2_email = "prof.varma@rvce.edu.in"
    client.post("/api/v1/auth/register", json={
        "email": t2_email,
        "password": "Password123!@#",
        "full_name": "Prof. K. Varma",
    })
    client.post("/api/v1/auth/login", json={"email": t2_email, "password": "Password123!@#"})

    # Teacher B tries to view Teacher A's class -> 404
    t2_view = client.get(f"/api/v1/classes/{t1_class_id}")
    assert t2_view.status_code == 404

    # Teacher B tries to edit Teacher A's class -> 404
    t2_edit = client.put(f"/api/v1/classes/{t1_class_id}", json={"course_name": "Hacked"})
    assert t2_edit.status_code == 404

    # Teacher B tries to enroll student in Teacher A's class -> 404
    t2_add_stu = client.post(f"/api/v1/classes/{t1_class_id}/students", json={
        "student_id_code": "1RV23EC999",
        "full_name": "Unauthorized Student",
    })
    assert t2_add_stu.status_code == 404

    # Teacher B's class list should not include Teacher A's class
    t2_classes = client.get("/api/v1/classes").json()
    assert all(c["id"] != t1_class_id for c in t2_classes)
