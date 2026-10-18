"""
Automated tests verifying multi-teacher data ownership and strict isolation.
Teacher A must never see, modify, or infer Teacher B's records.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import init_db

from app.db.session import SessionLocal
from app.models.user import User

client = TestClient(app)


from app.models.assessment import Assessment
from app.models.student import Student
from app.models.intervention import Intervention
from app.models.topic import LearningGap

def setup_module():
    init_db(seed_demo=False)
    db = SessionLocal()
    test_emails = ["teacher.a@school.org", "teacher.b@school.org"]
    test_users = db.query(User).filter(User.email.in_(test_emails)).all()
    test_uids = [u.id for u in test_users]
    if test_uids:
        db.query(Assessment).filter(Assessment.teacher_id.in_(test_uids)).delete(synchronize_session=False)
        db.query(Student).filter(Student.teacher_id.in_(test_uids)).delete(synchronize_session=False)
        db.query(Intervention).filter(Intervention.teacher_id.in_(test_uids)).delete(synchronize_session=False)
        db.query(LearningGap).filter(LearningGap.teacher_id.in_(test_uids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_uids)).delete(synchronize_session=False)
        db.commit()
    db.close()





def test_multi_teacher_data_isolation():
    """Verify complete isolation between Teacher A, Teacher B, and Demo Teacher."""
    client_a = TestClient(app)
    client_b = TestClient(app)

    # 1. Register Teacher A
    res_a = client_a.post("/api/v1/auth/register", json={
        "email": "teacher.a@school.org",
        "full_name": "Teacher Alpha",
        "password": "PasswordAlpha2026!",
    })
    assert res_a.status_code == 201

    # 2. Register Teacher B
    res_b = client_b.post("/api/v1/auth/register", json={
        "email": "teacher.b@school.org",
        "full_name": "Teacher Beta",
        "password": "PasswordBeta2026!",
    })
    assert res_b.status_code == 201

    # 3. Verify Teacher B starts with a clean empty state
    dash_b = client_b.get("/api/v1/dashboard/overview")
    assert dash_b.status_code == 200
    b_data = dash_b.json()
    assert b_data["metrics"]["students_count"] == 0
    assert b_data["metrics"]["assessments_count"] == 0
    assert len(b_data["recent_assessments"]) == 0
    assert b_data["is_demo_data"] is False

    # 4. Teacher A creates an assessment and student
    asm_a_res = client_a.post("/api/v1/assessments", json={
        "title": "Alpha Grade 9 Physics Quiz",
        "subject": "Physics",
        "grade_level": "Grade 9",
        "max_score": 50.0,
    })
    assert asm_a_res.status_code == 201
    asm_a_id = asm_a_res.json()["id"]

    stu_a_res = client_a.post("/api/v1/classes/students", json={
        "student_id_code": "ALPHA-001",
        "full_name": "Alpha Learner One",
        "grade_level": "Grade 9",
        "section": "A",
    })
    assert stu_a_res.status_code == 201
    stu_a_id = stu_a_res.json()["id"]

    # 5. Teacher B creates an assessment
    asm_b_res = client_b.post("/api/v1/assessments", json={
        "title": "Beta Grade 10 Chemistry Test",
        "subject": "Chemistry",
        "grade_level": "Grade 10",
        "max_score": 100.0,
    })
    assert asm_b_res.status_code == 201
    asm_b_id = asm_b_res.json()["id"]

    # 6. Verify Teacher B cannot see Teacher A's assessment in list
    b_assessments = client_b.get("/api/v1/assessments").json()
    b_asm_ids = [a["id"] for a in b_assessments]
    assert asm_b_id in b_asm_ids
    assert asm_a_id not in b_asm_ids

    # 7. Verify Teacher B cannot access Teacher A's assessment directly by ID (must return 404)
    access_attempt = client_b.get(f"/api/v1/assessments/{asm_a_id}")
    assert access_attempt.status_code == 404
    assert "not found" in access_attempt.json()["detail"].lower()

    # 8. Verify Teacher B cannot attach an intervention to Teacher A's student
    bad_interv = client_b.post("/api/v1/teacher-memory/interventions", json={
        "student_id": stu_a_id,
        "title": "Unauthorized Intervention Attempt",
        "strategy_type": "peer_tutoring",
        "description": "Should fail with 404.",
        "teacher_approved": True,
    })
    assert bad_interv.status_code == 404
    assert "not found in your roster" in bad_interv.json()["detail"].lower()

    # 9. Verify Demo Teacher login is isolated and flagged as demo
    demo_client = TestClient(app)
    demo_login = demo_client.post("/api/v1/auth/demo-login")
    assert demo_login.status_code == 200
    demo_dash = demo_client.get("/api/v1/dashboard/overview").json()
    assert demo_dash["is_demo_data"] is True
    assert demo_dash["metrics"]["students_count"] >= 20
