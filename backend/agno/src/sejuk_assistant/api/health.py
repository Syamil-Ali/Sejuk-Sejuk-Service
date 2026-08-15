from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, Response, status

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def liveness() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness(request: Request, response: Response) -> dict[str, Any]:
    configured = request.app.state.settings.dependency_configuration
    ready = all(configured.values())
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if ready else "unavailable",
        "dependencies": {
            name: "configured" if available else "unavailable"
            for name, available in configured.items()
        },
    }
