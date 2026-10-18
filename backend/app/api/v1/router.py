from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.assessments import router as assessments_router
from app.api.v1.endpoints.learning_gaps import router as gaps_router
from app.api.v1.endpoints.teacher_memory import router as memory_router
from app.api.v1.endpoints.classes import router as classes_router
from app.api.v1.endpoints.students import router as students_router
from app.api.v1.endpoints.ai import router as ai_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Teacher Authentication"])
api_router.include_router(ai_router, prefix="/ai", tags=["Gemini AI Intelligence"])
api_router.include_router(health_router, tags=["System"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(assessments_router, prefix="/assessments", tags=["Assessments"])
api_router.include_router(gaps_router, prefix="/learning-gaps", tags=["Learning Gaps"])
api_router.include_router(memory_router, prefix="/teacher-memory", tags=["Teacher Memory Engine"])
api_router.include_router(classes_router, prefix="/classes", tags=["Classes"])
api_router.include_router(students_router, prefix="/students", tags=["Students"])


