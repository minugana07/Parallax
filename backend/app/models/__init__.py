"""
Domain database models registration.
Exposes all entities for migration and metadata discovery.
"""
from app.models.user import User, UserSession
from app.models.academic_class import AcademicClass
from app.models.student import Student
from app.models.assessment import Assessment, StudentAssessmentScore
from app.models.topic import Topic, LearningGap
from app.models.intervention import Intervention
from app.models.follow_up import FollowUpResult

__all__ = [
    "User",
    "UserSession",
    "AcademicClass",
    "Student",
    "Assessment",
    "StudentAssessmentScore",
    "Topic",
    "LearningGap",
    "Intervention",
    "FollowUpResult",
]
