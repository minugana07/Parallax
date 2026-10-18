"""
Automated tests for Gemini AI integration, error handling, student privacy, and model fallback.
Mocks external API calls to avoid consuming quota or depending on network.
"""
from unittest.mock import MagicMock, patch
import json
from fastapi.testclient import TestClient

from app.main import app
from app.db.base import init_db
from app.services.gemini_service import GeminiService, _sanitize_error
from app.core.config import settings

client = TestClient(app)


def setup_module():
    init_db(seed_demo=True)


def test_ai_status_endpoint_never_leaks_secrets():
    """Verify /api/v1/ai/status returns config flag without leaking API key or prefix."""
    res = client.get("/api/v1/ai/status")
    assert res.status_code == 200
    data = res.json()
    assert "gemini_configured" in data
    assert "default_model" in data
    # Ensure no secret strings or partial keys exist in response
    serialized = json.dumps(data)
    assert "AIza" not in serialized
    assert settings.GEMINI_API_KEY not in serialized if settings.GEMINI_API_KEY else True


def test_ai_diagnostic_requires_authentication():
    """Verify unauthenticated requests to diagnostic are rejected with 401."""
    unauth = TestClient(app)
    res = unauth.post("/api/v1/ai/diagnostic")
    assert res.status_code == 401


def test_sanitize_error_redacts_keys():
    """Verify error sanitization strips real or synthetic Gemini API keys."""
    raw_error = "API error connecting with key AIzaSyDUMMYKEY12345678901234567890123: Quota exceeded"
    sanitized = _sanitize_error(raw_error)
    assert "AIzaSyDUMMYKEY" not in sanitized
    assert "[REDACTED_KEY]" in sanitized or "[REDACTED_API_KEY]" in sanitized


def test_mocked_gap_explanation():
    """Verify explain-gap endpoint with mocked Gemini response adheres to schema and privacy rules."""
    auth_client = TestClient(app)
    auth_client.post("/api/v1/auth/demo-login")

    mock_gemini_response = {
        "evidence_analysis": "Student demonstrated consistent sign reversal when factoring monic quadratics.",
        "key_skills_needing_attention": ["Middle term decomposition", "Sign distribution over brackets"],
        "unsupported_claims": "Does not prove overall arithmetic deficiency; confined to sign rules in quadratics.",
        "recommended_diagnostic_checks": ["Ask student to expand factored form aloud"],
        "evidence_strength": "moderate",
    }

    with patch.object(GeminiService, "_execute_with_fallback") as mock_exec:
        mock_exec.return_value = (json.dumps(mock_gemini_response), "gemini-3.8-flash")
        
        res = auth_client.post("/api/v1/ai/explain-gap", json={"gap_id": 1})
        assert res.status_code == 200
        data = res.json()
        assert data["gap_id"] == 1
        assert "evidence_analysis" in data
        assert len(data["key_skills_needing_attention"]) == 2
        assert "unsupported_claims" in data
        assert data["model_used"] == "gemini-3.8-flash"


def test_mocked_intervention_recommendation_requires_approval():
    """Verify AI intervention proposals explicitly flag that teacher approval is required."""
    auth_client = TestClient(app)
    auth_client.post("/api/v1/auth/demo-login")

    mock_proposals = {
        "proposals": [
            {
                "title": "Geometric Algebra Tiles Area Representation",
                "strategy_type": "visual_area_model",
                "learning_objective": "Understand quadratic middle term as rectangular area",
                "classroom_activity": "Guide student through building a 2D grid representing x^2 + 5x + 6.",
                "duration_minutes": 15,
                "materials_needed": "Algebra tiles set or grid paper",
                "check_understanding": "Solve one area decomposition problem independently.",
                "evidence_basis": "Directly resolves sign and term splitting confusion through visual geometry.",
                "limitations": "Assumes basic familiarity with rectangle area.",
                "requires_teacher_approval": True,
            }
        ]
    }

    with patch.object(GeminiService, "_execute_with_fallback") as mock_exec:
        mock_exec.return_value = (json.dumps(mock_proposals), "gemini-3.8-flash")
        
        res = auth_client.post("/api/v1/ai/recommend-intervention", json={"gap_id": 1})
        assert res.status_code == 200
        data = res.json()
        assert "proposals" in data
        assert len(data["proposals"]) == 1
        prop = data["proposals"][0]
        assert prop["requires_teacher_approval"] is True
        assert prop["strategy_type"] == "visual_area_model"


def test_mocked_assistant_endpoint():
    """Verify contextual teacher assistant responds properly."""
    auth_client = TestClient(app)
    auth_client.post("/api/v1/auth/demo-login")

    mock_assistant_res = {
        "answer": "For students struggling with quadratic sign decomposition, start with monic examples before introducing negative constants.",
        "suggested_follow_up_questions": ["Would you like a 10-minute warm-up worksheet?"]
    }

    with patch.object(GeminiService, "_execute_with_fallback") as mock_exec:
        mock_exec.return_value = (json.dumps(mock_assistant_res), "gemini-3.8-flash")
        
        res = auth_client.post("/api/v1/ai/assistant", json={
            "question": "What should I teach first to address the factoring bottleneck?",
            "context_type": "gap",
            "context_id": 1,
        })
        assert res.status_code == 200
        data = res.json()
        assert "answer" in data
        assert len(data["suggested_follow_up_questions"]) == 1


def test_mocked_memory_summary_no_false_causality():
    """Verify memory summary evaluation highlights causality caveats."""
    auth_client = TestClient(app)
    auth_client.post("/api/v1/auth/demo-login")

    mock_summary_res = {
        "observed_changes": "Retest score rose from 44% to 86% across 5 days.",
        "evidence_strength": "high",
        "causality_caveat": "Score increase reflects both visual area instruction and repeated practice effects rather than a single causal factor.",
        "suggested_next_step": "Reinforce in cumulative assessment next week."
    }

    with patch.object(GeminiService, "_execute_with_fallback") as mock_exec:
        mock_exec.return_value = (json.dumps(mock_summary_res), "gemini-3.8-flash")
        
        res = auth_client.post("/api/v1/ai/memory-summary", json={"intervention_id": 1})
        assert res.status_code == 200
        data = res.json()
        assert "causality_caveat" in data
        assert "practice effects" in data["causality_caveat"]
