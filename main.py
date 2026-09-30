"""
Me'morAI — Root Entrypoint Shim
Forwards to backend.main:app for uvicorn and container compatibility.
"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from backend.main import app

__all__ = ["app"]
