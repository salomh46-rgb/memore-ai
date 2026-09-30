"""
Me'morAI — Root Celery Worker Entrypoint Shim
Forwards to backend.tasks:celery_app for Celery CLI and container compatibility.
"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from backend.tasks import celery_app

# Celery CLI standard lookup
app = celery_app

__all__ = ["celery_app", "app"]
