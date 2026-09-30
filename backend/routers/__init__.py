"""
Me'morAI — API Routers to'plami.
"""
from .projects import router as projects_router
from .checks import router as checks_router

__all__ = ["projects_router", "checks_router"]
