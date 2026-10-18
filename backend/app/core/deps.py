from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserSession
from app.core.config import settings
from app.core.security import verify_csrf_if_cookie_auth


def get_session_token_and_source(request: Request) -> tuple[Optional[str], bool]:
    """
    Extracts session token from HttpOnly cookie (preferred) or Authorization Bearer header.
    Returns (token, is_cookie_source).
    """
    # 1. HttpOnly cookie (production browser flow)
    cookie_token = request.cookies.get(settings.COOKIE_NAME)
    if cookie_token:
        return cookie_token, True

    # 2. Authorization header: "Bearer <token>" (API clients & test suites)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        bearer_token = auth_header[7:].strip()
        if bearer_token:
            return bearer_token, False

    return None, False


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that enforces teacher authentication.
    Resolves session token against user_sessions table and verifies active status.
    """
    token, is_cookie = get_session_token_and_source(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify CSRF for cookie-based state-changing requests
    verify_csrf_if_cookie_auth(request, is_cookie)

    now = datetime.now(timezone.utc)
    # Check session in database
    session_record = (
        db.query(UserSession)
        .filter(UserSession.session_id == token, UserSession.expires_at > now)
        .first()
    )

    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == session_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional auth dependency. Returns current User if valid session exists, else None.
    Does not raise 401. Useful for endpoints with dual demo / authenticated access.
    """
    token, is_cookie = get_session_token_and_source(request)
    if not token:
        return None

    try:
        now = datetime.now(timezone.utc)
        session_record = (
            db.query(UserSession)
            .filter(UserSession.session_id == token, UserSession.expires_at > now)
            .first()
        )
        if not session_record:
            return None

        user = db.query(User).filter(User.id == session_record.user_id, User.is_active == True).first()
        return user
    except Exception:
        return None
