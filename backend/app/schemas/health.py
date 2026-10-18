from datetime import datetime, timezone
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    """Database connectivity and state indicators."""
    connected: bool
    engine: str
    status: str


class HealthResponse(BaseModel):
    """Service health response schema."""
    status: str = Field(..., json_schema_extra={"example": "healthy"})
    service: str = Field(..., json_schema_extra={"example": "Parallax API"})
    version: str = Field(..., json_schema_extra={"example": "0.1.0"})
    tagline: str = Field(..., json_schema_extra={"example": "Look beyond the marks."})
    environment: str = Field(..., json_schema_extra={"example": "development"})
    database: DatabaseHealth
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RootResponse(BaseModel):
    """Service root welcome response schema."""
    service: str
    tagline: str
    description: str
    version: str
    status: str
    api_docs: str
    health_check: str
