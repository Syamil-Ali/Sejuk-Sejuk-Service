from __future__ import annotations

from fastapi import FastAPI

from sejuk_assistant import __version__
from sejuk_assistant.api.chat import router as chat_router
from sejuk_assistant.api.documents import router as documents_router
from sejuk_assistant.api.health import router as health_router
from sejuk_assistant.chat.limits import RequestLimiter
from sejuk_assistant.observability import Metrics
from sejuk_assistant.settings import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    application = FastAPI(
        title="Sejuk Assistant",
        version=__version__,
        docs_url="/docs" if resolved.environment != "production" else None,
        redoc_url=None,
    )
    application.state.settings = resolved
    application.state.document_intake_store = None
    application.state.document_extractor = None
    application.state.request_limiter = RequestLimiter(
        resolved.requests_per_minute, resolved.max_concurrent_requests
    )
    application.state.metrics = Metrics()
    application.state.last_latency_ms = 0
    application.include_router(health_router)
    application.include_router(documents_router)
    application.include_router(chat_router)
    return application


app = create_app()


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "sejuk_assistant.main:app",
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
    )
