import os
from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_base_dir = Path(__file__).resolve().parent.parent.parent
_env_path = _base_dir / ".env"



class Settings(BaseSettings):
    """Parallax backend configuration settings."""

    # Project metadata
    PROJECT_NAME: str = "parallax"
    PROJECT_DESCRIPTION: str = "AI-powered Teacher Intelligence Platform"
    TAGLINE: str = "SEE BEYOND THE SCORE"
    VERSION: str = "0.2.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server binding
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # API Routing
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./parallax.db"

    # Gemini AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-3.8-flash"

    # Security & Session Management
    SESSION_SECRET: str = "parallax-teacher-session-secret-karnataka-2026-key"
    COOKIE_NAME: str = "parallax_session"
    COOKIE_SECURE: bool = False  # Set to True in HTTPS production
    COOKIE_SAMESITE: str = "lax"
    SESSION_MAX_AGE: int = 60 * 60 * 24 * 7  # 7 days

    # CORS origins
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
        ]

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def resolve_sqlite_path(cls, v: str) -> str:
        if v.startswith("sqlite:///") and not v.startswith("sqlite:////"):
            rel_path = v[len("sqlite:///"):]
            if not os.path.isabs(rel_path):
                abs_path = (_base_dir / rel_path).resolve().as_posix()
                return f"sqlite:///{abs_path}"
        return v

    model_config = SettingsConfigDict(
        env_file=(str(_env_path) if _env_path.exists() else ".env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

