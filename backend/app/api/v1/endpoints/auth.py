from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserSession
from app.schemas.auth import (
    TeacherRegister,
    TeacherLogin,
    TeacherResponse,
    AuthMessage,
)
from app.core.security import (
    hash_password,
    verify_password,
    generate_session_token,
    generate_csrf_token,
    set_auth_cookies,
    clear_auth_cookies,
)
from app.core.deps import get_current_user, get_session_token_and_source
from app.core.config import settings

router = APIRouter()


@router.post(
    "/register",
    response_model=TeacherResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New Teacher Account",
    description="Registers a new teacher account with Argon2id password hashing and establishes an authenticated session.",
)
def register_teacher(
    payload: TeacherRegister,
    response: Response,
    db: Session = Depends(get_db),
) -> TeacherResponse:
    # 1. Normalize and check email uniqueness
    normalized_email = payload.email.strip().lower()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please log in.",
        )

    # 2. Hash password and create user
    new_user = User(
        email=normalized_email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        is_active=True,
        is_demo=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Create server-managed session
    session_id = generate_session_token()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=settings.SESSION_MAX_AGE)

    user_session = UserSession(
        session_id=session_id,
        user_id=new_user.id,
        created_at=now,
        expires_at=expires,
    )
    db.add(user_session)
    db.commit()

    # 4. Set HttpOnly and CSRF cookies
    csrf_token = set_auth_cookies(response, session_id)

    return TeacherResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        is_active=new_user.is_active,
        is_demo=new_user.is_demo,
        created_at=new_user.created_at,
        csrf_token=csrf_token,
    )


@router.post(
    "/login",
    response_model=TeacherResponse,
    status_code=status.HTTP_200_OK,
    summary="Teacher Login",
    description="Authenticates teacher credentials and issues a secure HttpOnly session cookie.",
)
def login_teacher(
    payload: TeacherLogin,
    response: Response,
    db: Session = Depends(get_db),
) -> TeacherResponse:
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Generic error message to prevent user enumeration
    generic_error = "Invalid email or password."

    if not user:
        # Run dummy verify to mitigate timing attacks
        verify_password("dummy", "$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=generic_error,
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=generic_error,
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact your school administrator.",
        )

    # Create server-managed session
    session_id = generate_session_token()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=settings.SESSION_MAX_AGE)

    user_session = UserSession(
        session_id=session_id,
        user_id=user.id,
        created_at=now,
        expires_at=expires,
    )
    db.add(user_session)
    db.commit()

    # Set cookies
    csrf_token = set_auth_cookies(response, session_id)

    return TeacherResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_demo=user.is_demo,
        created_at=user.created_at,
        csrf_token=csrf_token,
    )


@router.post(
    "/demo-login",
    response_model=TeacherResponse,
    status_code=status.HTTP_200_OK,
    summary="Demo Mode Quick Login",
    description="Authenticates as the seeded Demo Teacher to explore illustrative data.",
)
def login_demo_teacher(
    response: Response,
    db: Session = Depends(get_db),
) -> TeacherResponse:
    from app.db.migrations import DEMO_TEACHER_EMAIL

    demo_user = db.query(User).filter(User.email == DEMO_TEACHER_EMAIL).first()
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo teacher account not found. Database migration may be needed.",
        )

    # Create session
    session_id = generate_session_token()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=settings.SESSION_MAX_AGE)

    user_session = UserSession(
        session_id=session_id,
        user_id=demo_user.id,
        created_at=now,
        expires_at=expires,
    )
    db.add(user_session)
    db.commit()

    csrf_token = set_auth_cookies(response, session_id)

    return TeacherResponse(
        id=demo_user.id,
        email=demo_user.email,
        full_name=demo_user.full_name,
        is_active=demo_user.is_active,
        is_demo=True,
        created_at=demo_user.created_at,
        csrf_token=csrf_token,
    )


@router.post(
    "/logout",
    response_model=AuthMessage,
    status_code=status.HTTP_200_OK,
    summary="Teacher Logout",
    description="Invalidates server-side session and clears authentication cookies.",
)
def logout_teacher(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthMessage:
    token, _ = get_session_token_and_source(request)
    if token:
        db.query(UserSession).filter(UserSession.session_id == token).delete()
        db.commit()

    clear_auth_cookies(response)
    return AuthMessage(status="success", message="Logged out successfully.")


@router.get(
    "/me",
    response_model=TeacherResponse,
    status_code=status.HTTP_200_OK,
    summary="Current Authenticated Teacher",
    description="Returns profile information for the currently authenticated session.",
)
def get_current_teacher_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> TeacherResponse:
    csrf_cookie = request.cookies.get("parallax_csrf")
    return TeacherResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_demo=current_user.is_demo,
        created_at=current_user.created_at,
        csrf_token=csrf_cookie,
    )
