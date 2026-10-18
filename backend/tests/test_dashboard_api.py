"""
Automated tests for Parallax Stage 2 Dashboard, Assessments, and Teacher Memory API.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import init_db

client = TestClient(app)


def setup_module():
    """Ensure database schema is initialized and demo teacher is logged in."""
    init_db(seed_demo=True)
    res = client.post("/api/v1/auth/demo-login")
    assert res.status_code == 200



def test_dashboard_overview_endpoint():
    """Verify GET /api/v1/dashboard/overview returns complete intelligence payload."""
    response = client.get("/api/v1/dashboard/overview")
    assert response.status_code == 200
    data = response.json()

    # Check metrics
    assert "metrics" in data
    metrics = data["metrics"]
    assert metrics["classes_count"] >= 4
    assert metrics["students_count"] >= 24
    assert metrics["assessments_count"] >= 6
    assert metrics["learning_gaps_count"] >= 1
    assert "active_semesters" in metrics
    assert "active_semesters_summary" in metrics
    assert len(metrics["active_semesters"]) >= 1
    assert "Sem" in metrics["active_semesters_summary"]

    # Check class performance data for charts
    assert "class_performance" in data
    assert len(data["class_performance"]) >= 1
    first_perf = data["class_performance"][0]
    assert "title" in first_perf
    assert "average_score" in first_perf
    assert "benchmark_score" in first_perf

    # Check learning gaps
    assert "learning_gaps" in data
    assert len(data["learning_gaps"]) >= 1
    first_gap = data["learning_gaps"][0]
    assert "topic_name" in first_gap
    assert "evidence" in first_gap
    assert "severity" in first_gap

    # Check students needing support
    assert "students_needing_support" in data
    assert len(data["students_needing_support"]) >= 1
    first_stu = data["students_needing_support"][0]
    assert "student_id_code" in first_stu
    assert "evidence" in first_stu

    # Check Teacher Memory preview
    assert "memory_engine_preview" in data
    assert len(data["memory_engine_preview"]) >= 1
    first_mem = data["memory_engine_preview"][0]
    assert "assessment_evidence" in first_mem
    assert "learning_gap" in first_mem
    assert "intervention_title" in first_mem
    assert "outcome_status" in first_mem

    # Check recommendation
    assert "teaching_recommendation" in data
    rec = data["teaching_recommendation"]
    assert "topic_name" in rec
    assert "reason_evidence" in rec
    assert "suggested_action" in rec
    assert data["is_demo_data"] is True


def test_assessments_endpoints():
    """Verify GET and POST /api/v1/assessments."""
    # List
    response = client.get("/api/v1/assessments")
    assert response.status_code == 200
    assessments = response.json()
    assert isinstance(assessments, list)
    assert len(assessments) >= 1

    # Create new
    payload = {
        "title": "Unit 3 Mastery Quiz: Chemical Bonding",
        "subject": "Science",
        "grade_level": "Grade 9",
        "max_score": 50.0,
    }
    create_res = client.post("/api/v1/assessments", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["title"] == payload["title"]
    assert created["max_score"] == 50.0

    # Get details
    detail_res = client.get(f"/api/v1/assessments/{created['id']}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == created["id"]
    assert "scores" in detail


def test_learning_gaps_endpoint():
    """Verify GET /api/v1/learning-gaps returns ranked topics."""
    response = client.get("/api/v1/learning-gaps")
    assert response.status_code == 200
    gaps = response.json()
    assert isinstance(gaps, list)
    assert len(gaps) >= 1
    assert "affected_students_count" in gaps[0]
    assert "suggested_strategy" in gaps[0]


def test_teacher_memory_chains_endpoint():
    """Verify GET /api/v1/teacher-memory returns 4-step chains."""
    response = client.get("/api/v1/teacher-memory")
    assert response.status_code == 200
    chains = response.json()
    assert isinstance(chains, list)
    assert len(chains) >= 1

    first = chains[0]
    assert "assessment_title" in first
    assert "initial_score_percent" in first
    assert "gap_description" in first
    assert "intervention_title" in first
    assert "outcome_status" in first
    assert "recommended_next_step" in first


def test_record_intervention_and_follow_up():
    """Verify recording an intervention and logging a follow-up outcome."""
    # Record intervention for student 1
    interv_payload = {
        "student_id": 1,
        "title": "One-on-One Worked Example Protocol",
        "strategy_type": "guided_worked_examples",
        "description": "Reviewed sign error patterns on binomial expansions.",
        "teacher_approved": True,
    }
    res = client.post("/api/v1/teacher-memory/interventions", json=interv_payload)
    assert res.status_code == 201
    interv = res.json()
    assert interv["title"] == interv_payload["title"]

    # Log follow-up
    fu_payload = {
        "intervention_id": interv["id"],
        "outcome_status": "resolved",
        "outcome_score": 88.0,
        "observations": "Follow-up test demonstrated complete sign mastery.",
    }
    fu_res = client.post("/api/v1/teacher-memory/follow-ups", json=fu_payload)
    assert fu_res.status_code == 200


def test_classes_endpoint():
    """Verify GET /api/v1/classes returns rosters and comprehension averages."""
    response = client.get("/api/v1/classes")
    assert response.status_code == 200
    classes = response.json()
    assert isinstance(classes, list)
    assert len(classes) >= 1
    assert "class_name" in classes[0]
    assert "student_count" in classes[0]
    assert "average_score_percent" in classes[0]
    assert "students" in classes[0]
