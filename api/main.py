"""FastAPI backend for the Creative Hotline Command Center.

Wraps existing Python business logic from app/utils/ and app/services/
and exposes it as a REST API consumed by the React frontend.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the project root is importable so `app.utils.*` resolves
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.routers import clients, kpis, pipeline, analytics, health  # noqa: E402

app = FastAPI(
    title="Creative Hotline API",
    version="6.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kpis.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/api/ping")
def ping():
    return {"status": "ok", "version": "6.0.0"}
