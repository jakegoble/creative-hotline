"""Health check endpoint."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def get_health():
    # In demo mode, return simulated health data
    return [
        {"service": "Notion", "status": "healthy", "latency_ms": 245, "message": "Connected"},
        {"service": "Stripe", "status": "healthy", "latency_ms": 180, "message": "Connected"},
        {"service": "Calendly", "status": "healthy", "latency_ms": 310, "message": "Connected"},
        {"service": "Claude AI", "status": "healthy", "latency_ms": 520, "message": "claude-sonnet-4-5-20250929"},
        {"service": "n8n", "status": "healthy", "latency_ms": 150, "message": "5 workflows active"},
        {"service": "ManyChat", "status": "not_configured", "message": "API key not set"},
        {"service": "Fireflies", "status": "not_configured", "message": "API key not set"},
    ]
