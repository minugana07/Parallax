"""
Automated tests for Parallax backend foundation and system endpoints.
"""
from fastapi.testclient import TestClient
from app.main import app
from app.db.base import init_db
from app.db.session import engine
from app.core.config import settings
from sqlalchemy import inspect

client = TestClient(app)


def test_database_initialization():
    """Verify that all core database tables are initialized properly."""
    init_db()
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    expected_tables = {
        "students",
        "assessments",
        "student_assessment_scores",
        "topics",
        "learning_gaps",
        "interventions",
        "follow_up_results",
    }
    for table in expected_tables:
        assert table in tables, f"Expected table '{table}' not found in SQLite schema."


def test_root_endpoint():
    """Verify root endpoint returns 200 and expected metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == settings.PROJECT_NAME
    assert data["status"] == "running"
    assert data["tagline"] == settings.TAGLINE
    assert "api_docs" in data
    assert "health_check" in data


def test_top_level_health_endpoint():
    """Verify top-level /health endpoint returns 200 and healthy DB connection."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["connected"] is True
    assert data["database"]["engine"] == "sqlite"
    assert data["database"]["status"] == "operational"


def test_api_v1_health_endpoint():
    """Verify /api/v1/health endpoint responds identically."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["connected"] is True
