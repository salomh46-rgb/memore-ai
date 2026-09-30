"""
Handlers paketi
"""
from .start import router as start_router
from .demo import router as demo_router
from .cta import router as cta_router

__all__ = ["start_router", "demo_router", "cta_router"]
