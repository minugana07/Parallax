from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.base import init_db
from app.db.session import check_db_connection
from app.schemas.health import HealthResponse, RootResponse, DatabaseHealth
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management.
    Initializes database schema on startup without inserting mock data.
    """
    # Initialize SQLite schema
    init_db()
    yield
    # Cleanup tasks can be added here if needed


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for local development and frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler for uncaught server errors."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred.",
            "path": request.url.path,
        },
    )


@app.get(
    "/",
    response_model=RootResponse,
    status_code=status.HTTP_200_OK,
    summary="Root Endpoint",
    description="Confirms that the Parallax backend service is running.",
    tags=["System"],
)
def root() -> RootResponse:
    """Root endpoint confirming service availability."""
    return RootResponse(
        service=settings.PROJECT_NAME,
        tagline=settings.TAGLINE,
        description=settings.PROJECT_DESCRIPTION,
        version=settings.VERSION,
        status="running",
        api_docs="/docs",
        health_check="/health",
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Returns backend runtime status and SQLite connectivity.",
    tags=["System"],
)
def health() -> HealthResponse:
    """Top-level health check endpoint."""
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


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
