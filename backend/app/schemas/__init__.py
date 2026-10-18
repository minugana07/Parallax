"""Schema definitions for request and response validation."""
from app.schemas.health import HealthResponse, RootResponse, DatabaseHealth
from app.schemas.auth import TeacherRegister, TeacherLogin, TeacherResponse, AuthMessage

__all__ = [
    "HealthResponse",
    "RootResponse",
    "DatabaseHealth",
    "TeacherRegister",
    "TeacherLogin",
    "TeacherResponse",
    "AuthMessage",
]

