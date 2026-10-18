from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator



class TeacherRegister(BaseModel):
    """Teacher registration schema."""

    email: EmailStr = Field(..., description="Teacher institutional or personal email address")
    full_name: str = Field(..., min_length=2, max_length=150, description="Full professional name")
    password: str = Field(..., min_length=8, max_length=128, description="Secure password (minimum 8 characters)")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must contain at least 2 characters.")
        return cleaned


class TeacherLogin(BaseModel):
    """Teacher login schema."""

    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class TeacherResponse(BaseModel):
    """Teacher profile public response without credential leakage."""

    id: int
    email: str
    full_name: str
    institution: Optional[str] = "RV College of Engineering (RVCE)"
    department: Optional[str] = "Computer Science & Engineering"
    designation: Optional[str] = "Assistant Professor"
    is_active: bool
    is_demo: bool = False
    created_at: Optional[datetime] = None
    csrf_token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TeacherProfileUpdate(BaseModel):
    """Schema for updating teacher profile and institutional affiliation."""

    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    institution: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=200)
    designation: Optional[str] = Field(None, max_length=100)


class AuthMessage(BaseModel):
    """Standard authentication message response."""

    status: str = "success"
    message: str
