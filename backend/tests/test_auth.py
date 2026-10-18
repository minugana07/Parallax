"""
Automated tests for teacher authentication, session security, and access control.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import init_db
from app.db.session import SessionLocal
from app.models.user import User, UserSession

client = TestClient(app)


def setup_module():
    init_db(seed_demo=False)
    db = SessionLocal()
    test_emails = ["ms.smith@parallax.edu", "sarah.smith@parallax.edu", "test.teacher@parallax.edu"]
    test_users = db.query(User).filter(User.email.in_(test_emails)).all()
    test_uids = [u.id for u in test_users]
    if test_uids:
        db.query(UserSession).filter(UserSession.user_id.in_(test_uids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(test_uids)).delete(synchronize_session=False)
        db.commit()
    db.close()



def test_unauthenticated_access_blocked():
    """Verify unauthenticated requests cannot access protected endpoints."""
    # Create fresh client without cookies
    unauth_client = TestClient(app)
    
    # Dashboard overview
    res = unauth_client.get("/api/v1/dashboard/overview")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]

    # Assessments
    res = unauth_client.get("/api/v1/assessments")
    assert res.status_code == 401

    # Learning gaps
    res = unauth_client.get("/api/v1/learning-gaps")
    assert res.status_code == 401

    # Teacher memory
    res = unauth_client.get("/api/v1/teacher-memory")
    assert res.status_code == 401

    # Classes
    res = unauth_client.get("/api/v1/classes")
    assert res.status_code == 401


def test_teacher_registration_flow():
    """Verify teacher registration, password hashing, and session creation."""
    reg_client = TestClient(app)
    payload = {
        "email": "Ms.Smith@Parallax.Edu",  # Mixed case to test normalization
        "full_name": "Sarah Smith",
        "password": "StrongPassword2026!",
    }
    res = reg_client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "ms.smith@parallax.edu"  # Lowercase normalized
    assert data["full_name"] == "Sarah Smith"
    assert data["is_active"] is True
    assert data["is_demo"] is False
    assert "csrf_token" in data

    # Verify password in database is hashed with Argon2id and not plaintext
    db = SessionLocal()
    user = db.query(User).filter(User.email == "ms.smith@parallax.edu").first()
    assert user is not None
    assert user.hashed_password != payload["password"]
    assert user.hashed_password.startswith("$argon2id$")
    db.close()

    # Verify session cookie was set and /me works
    me_res = reg_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "ms.smith@parallax.edu"


def test_duplicate_registration_rejected():
    """Verify duplicate registration returns 409 Conflict."""
    reg_client = TestClient(app)
    payload = {
        "email": "ms.smith@parallax.edu",
        "full_name": "Another Smith",
        "password": "Password12345!",
    }
    res = reg_client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"]


def test_login_success_and_logout():
    """Verify login with credentials, session cookie, and logout invalidation."""
    auth_client = TestClient(app)

    # Login
    res = auth_client.post("/api/v1/auth/login", json={
        "email": "ms.smith@parallax.edu",
        "password": "StrongPassword2026!",
    })
    assert res.status_code == 200
    assert res.json()["email"] == "ms.smith@parallax.edu"

    # Confirm session works
    me_res = auth_client.get("/api/v1/auth/me")
    assert me_res.status_code == 200

    # Logout
    logout_res = auth_client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Session must now be invalid
    after_logout = auth_client.get("/api/v1/auth/me")
    assert after_logout.status_code == 401


def test_invalid_login_credentials():
    """Verify wrong password and non-existent email return generic 401 messages."""
    auth_client = TestClient(app)

    # Wrong password
    res = auth_client.post("/api/v1/auth/login", json={
        "email": "ms.smith@parallax.edu",
        "password": "WrongPassword999!",
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."

    # Non-existent user
    res2 = auth_client.post("/api/v1/auth/login", json={
        "email": "nonexistent.teacher@school.org",
        "password": "SomePassword123!",
    })
    assert res2.status_code == 401
    assert res2.json()["detail"] == "Invalid email or password."


def test_update_teacher_profile():
    """Verify that teacher profile updates (name, institution, department, designation) persist properly."""
    client_test = TestClient(app)

    # 1. Register test teacher
    reg_email = "test.profile.teacher@parallax.edu"
    # Ensure clean state for this test email
    db = SessionLocal()
    existing = db.query(User).filter(User.email == reg_email).first()
    if existing:
        db.query(UserSession).filter(UserSession.user_id == existing.id).delete()
        db.query(User).filter(User.id == existing.id).delete()
        db.commit()
    db.close()

    reg_res = client_test.post("/api/v1/auth/register", json={
        "email": reg_email,
        "full_name": "Initial Name",
        "password": "Password123!@#",
    })
    assert reg_res.status_code == 201

    # 2. Check initial profile
    me_res = client_test.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["full_name"] == "Initial Name"
    assert me_data["institution"] == "RV College of Engineering (RVCE)"

    # 3. Update profile
    update_res = client_test.put("/api/v1/auth/profile", json={
        "full_name": "Dr. Minu Ganapathy",
        "institution": "RV College of Engineering",
        "department": "Computer Science & Engineering",
        "designation": "Associate Professor & HoD",
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["full_name"] == "Dr. Minu Ganapathy"
    assert updated["designation"] == "Associate Professor & HoD"

    # 4. Verify persistence on new /me request
    me_res2 = client_test.get("/api/v1/auth/me")
    assert me_res2.status_code == 200
    assert me_res2.json()["full_name"] == "Dr. Minu Ganapathy"
    assert me_res2.json()["designation"] == "Associate Professor & HoD"

    # Cleanup test user
    db = SessionLocal()
    clean_user = db.query(User).filter(User.email == reg_email).first()
    if clean_user:
        db.query(UserSession).filter(UserSession.user_id == clean_user.id).delete()
        db.query(User).filter(User.id == clean_user.id).delete()
        db.commit()
    db.close()
