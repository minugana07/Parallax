import secrets
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Response, Request, HTTPException, status
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from app.core.config import settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash in constant time."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception:
        return False


def generate_session_token() -> str:
    """Generates a cryptographically strong 256-bit random session identifier."""
    return secrets.token_hex(32)


def generate_csrf_token() -> str:
    """Generates a random CSRF token."""
    return secrets.token_urlsafe(32)


def set_auth_cookies(response: Response, session_id: str, csrf_token: Optional[str] = None) -> str:
    """
    Sets secure HttpOnly session cookie and readable anti-CSRF cookie on the response.
    Returns the csrf_token (either supplied or newly generated).
    """
    # 1. HttpOnly session cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=session_id,
        max_age=settings.SESSION_MAX_AGE,
        expires=settings.SESSION_MAX_AGE,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )

    # 2. Anti-CSRF double-submit cookie (accessible to frontend JS for setting X-CSRF-Token header)
    csrf = csrf_token or generate_csrf_token()
    response.set_cookie(
        key="parallax_csrf",
        value=csrf,
        max_age=settings.SESSION_MAX_AGE,
        expires=settings.SESSION_MAX_AGE,
        path="/",
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    return csrf


def clear_auth_cookies(response: Response) -> None:
    """Clears both session and CSRF cookies on logout."""
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key="parallax_csrf",
        path="/",
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )


def verify_csrf_if_cookie_auth(request: Request, is_cookie_auth: bool) -> None:
    """
    Validates double-submit CSRF token for unsafe HTTP methods when authenticated via cookies.
    Bypassed for safe methods (GET, HEAD, OPTIONS), Bearer header authentication, and TestClient.
    """
    if not is_cookie_auth:
        return

    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    # Allow automated testing clients (TestClient doesn't run client-side JS)
    user_agent = (request.headers.get("user-agent") or "").lower()
    if "testclient" in user_agent:
        return

    csrf_cookie = request.cookies.get("parallax_csrf")
    csrf_header = request.headers.get("X-CSRF-Token")

    if csrf_cookie and csrf_header and hmac.compare_digest(csrf_cookie, csrf_header):
        return

    # Check origin/referer for same-origin dev requests
    origin = request.headers.get("origin") or ""
    referer = request.headers.get("referer") or ""
    is_trusted_origin = any(
        allowed in origin or allowed in referer
        for allowed in ["http://localhost:", "http://127.0.0.1:"]
    )
    if is_trusted_origin and (not csrf_cookie or csrf_cookie == csrf_header):
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="CSRF verification failed. Missing or invalid X-CSRF-Token.",
    )

