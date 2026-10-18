from fastapi import APIRouter, status
from app.core.config import settings
from app.db.session import check_db_connection
from app.schemas.health import HealthResponse, DatabaseHealth

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns backend runtime status and database engine connectivity.",
)
def get_health() -> HealthResponse:
    db_info = check_db_connection()
    is_healthy = db_info.get("connected", False)

    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        tagline=settings.TAGLINE,
        environment=settings.ENVIRONMENT,
        database=DatabaseHealth(
            connected=db_info.get("connected", False),
            engine=db_info.get("engine", "unknown"),
            status=db_info.get("status", "unknown"),
        ),
    )
