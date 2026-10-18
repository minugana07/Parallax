"""
Tests for Assessments & Quizzes Workspace, Question Authoring, Marks Entry, CSV Import, and AI Diagnostics.
"""
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import init_db

client = TestClient(app)


def setup_module():
    """Ensure database schema is initialized and demo teacher is logged in."""
    init_db(seed_demo=True)
    res = client.post("/api/v1/auth/demo-login")
    assert res.status_code == 200


def test_create_and_manage_quiz_flow():
    # 1. Ensure authenticated
    client.post("/api/v1/auth/demo-login")

    # 2. Create a Quiz with 2 authored questions
    quiz_payload = {
        "title": "CIE 1 Diagnostic Quiz on AVL Trees",
        "subject": "Data Structures & Algorithms",
        "grade_level": "Semester 3",
        "semester": "Semester 3",
        "course_code": "22CS32",
        "assessment_type": "quiz",
        "status": "draft",
        "duration_minutes": 25,
        "passing_score": 4.0,
        "max_score": 10.0,
        "total_questions": 2,
        "quiz_questions": [
            {
                "id": "q1",
                "question_text": "What is the maximum balance factor allowed in an AVL tree?",
                "question_type": "mcq",
                "options": ["0", "1", "2", "Unlimited"],
                "correct_answer": 1,
                "marks": 5.0,
                "explanation": "In an AVL tree, the balance factor for every node must be -1, 0, or 1.",
            },
            {
                "id": "q2",
                "question_text": "Which rotation is required for a Left-Right (LR) imbalance?",
                "question_type": "mcq",
                "options": ["Single Left", "Single Right", "Left-Right Double", "Right-Left Double"],
                "correct_answer": 2,
                "marks": 5.0,
                "explanation": "An LR imbalance requires a left rotation on the child followed by a right rotation on the parent.",
            },
        ],
    }

    create_res = client.post("/api/v1/assessments", json=quiz_payload)
    assert create_res.status_code == 201
    quiz_data = create_res.json()
    assert quiz_data["title"] == quiz_payload["title"]
    assert quiz_data["has_quiz_data"] is True
    assert quiz_data["assessment_type"] == "quiz"
    quiz_id = quiz_data["id"]

    # 3. Fetch quiz details
    get_res = client.get(f"/api/v1/assessments/{quiz_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert len(detail["quiz_questions"]) == 2
    assert detail["quiz_questions"][0]["id"] == "q1"
    assert detail["quiz_questions"][0]["marks"] == 5.0

    # 4. Filter assessments by assessment_type
    filtered_res = client.get("/api/v1/assessments?assessment_type=quiz")
    assert filtered_res.status_code == 200
    quizzes = filtered_res.json()
    assert any(q["id"] == quiz_id for q in quizzes)

    # 5. CSV Score Import using known demo USNs
    csv_text = """USN,Score,Feedback
1RV23CS001,9.0,Great understanding of AVL balance factors
1RV23CS002,4.0,Review double rotations
"""
    import_res = client.post(
        f"/api/v1/assessments/{quiz_id}/import-scores",
        json={"csv_text": csv_text},
    )
    assert import_res.status_code == 200
    import_data = import_res.json()
    assert import_data["student_count"] >= 2
    assert import_data["status"] == "graded"

    # 6. AI Diagnostic Analysis on the Quiz (mock fallback or real)
    mock_analysis = {
        "overall_performance_summary": "Cohort demonstrates proficiency in balance factors but confusion on LR rotations.",
        "strengths_identified": ["Single rotation mechanics", "Height calculation"],
        "critical_misconceptions": ["Double rotation order of operations"],
        "question_difficulty_breakdown": [
            {
                "question_id": "q1",
                "question_text": "Maximum balance factor allowed",
                "difficulty_rating": "low",
                "estimated_success_rate": 85.0,
                "common_pitfall": "Assuming 0 is the only balanced state",
            }
        ],
        "recommended_pedagogical_actions": ["Conduct live whiteboard trace of LR rotation"],
        "causality_caveat": "Results reflect point-in-time check.",
    }
    with patch("app.services.gemini_service.GeminiService._execute_with_fallback", return_value=(str(mock_analysis).replace("'", '"'), "gemini-mock")):
        ai_res = client.post(f"/api/v1/assessments/{quiz_id}/ai-analysis")
        assert ai_res.status_code == 200
        ai_data = ai_res.json()
        assert "overall_performance_summary" in ai_data
        assert "critical_misconceptions" in ai_data
        assert "recommended_pedagogical_actions" in ai_data
        assert "causality_caveat" in ai_data


def test_ai_generate_quiz_questions():
    # Login as demo
    client.post("/api/v1/auth/demo-login")

    payload = {
        "topic_name": "Virtual Memory and Paging",
        "subject": "Operating Systems",
        "course_code": "22CS42",
        "semester": "Semester 4",
        "question_count": 3,
        "difficulty": "intermediate",
    }

    mock_quiz_response = {
        "topic_name": "Virtual Memory and Paging",
        "questions": [
            {
                "id": f"q{i}",
                "question_text": f"What is the role of the TLB in paging scenario {i}?",
                "question_type": "mcq",
                "options": ["Fast translation cache", "Secondary storage", "Instruction pipeline", "Bus arbiter"],
                "correct_answer": 0,
                "marks": 2.0,
                "explanation": "The TLB caches recent virtual-to-physical address mappings.",
            }
            for i in range(1, 4)
        ]
    }
    import json
    with patch("app.services.gemini_service.GeminiService._execute_with_fallback", return_value=(json.dumps(mock_quiz_response), "gemini-mock")):
        res = client.post("/api/v1/ai/generate-quiz", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["topic_name"] == "Virtual Memory and Paging"
        assert len(data["questions"]) == 3
        for q in data["questions"]:
            assert len(q["options"]) == 4
            assert q["marks"] > 0
            assert q["explanation"]
