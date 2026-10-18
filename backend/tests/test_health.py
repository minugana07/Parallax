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


def test_openapi_schema_generation():
    """Verify OpenAPI schema generates without unresolved ForwardRef or Pydantic errors."""
    schema = app.openapi()
    assert schema is not None
    assert "paths" in schema
    assert "/api/v1/assessments" in schema["paths"]
    
    # Verify class_id query parameter schema on list_assessments
    get_assessments = schema["paths"]["/api/v1/assessments"]["get"]
    param_names = [p["name"] for p in get_assessments.get("parameters", [])]
    assert "class_id" in param_names


def test_openapi_json_endpoint():
    """Verify /openapi.json endpoint returns 200 and valid JSON schema."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert data["info"]["title"] == settings.PROJECT_NAME
    assert "/api/v1/dashboard/overview" in data["paths"]
    assert "/api/v1/auth/login" in data["paths"]


def test_docs_endpoint():
    """Verify Swagger UI /docs endpoint returns 200."""
    response = client.get("/docs")
    assert response.status_code == 200

