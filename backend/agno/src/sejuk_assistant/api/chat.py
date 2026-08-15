from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from sejuk_assistant.api.dependencies import authenticated_actor
from sejuk_assistant.audit import AuditWriter
from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.chat.limits import RateLimitExceeded
from sejuk_assistant.chat.orchestrator import ChatOrchestrator
from sejuk_assistant.chat.response import GeminiAnswerGenerator
from sejuk_assistant.chat.schemas import ChatRequest
from sejuk_assistant.chat.store import ConversationStore
from sejuk_assistant.documents.retrieval import DocumentRetrieval
from sejuk_assistant.query.skill import QuerySkill
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository
from sejuk_assistant.tools.operations import OperationsTools

router = APIRouter(prefix="/v1", tags=["chat"])


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    request: Request,
    actor: Annotated[ActorContext, Depends(authenticated_actor)],
) -> StreamingResponse:
    authorization = request.headers.get("authorization", "")
    token = authorization.removeprefix("Bearer ").strip()

    async def events() -> AsyncIterator[str]:
        repository = CallerSupabaseRepository(request.app.state.settings, token, actor)
        started = time.monotonic()
        try:
            async with request.app.state.request_limiter.acquire(actor.user_id):
                store = ConversationStore(
                    repository, request.app.state.settings.conversation_retention_days
                )
                thread_id = await store.ensure_thread(actor, payload.thread_id)
                history = list(reversed(await store.history(actor, thread_id)))
                await store.add_message(actor, thread_id, "user", payload.message, "completed")
                answer_generator = None
                if request.app.state.settings.model_provider == "gemini":
                    answer_generator = GeminiAnswerGenerator(request.app.state.settings)
                orchestrator = ChatOrchestrator(
                    actor,
                    OperationsTools(actor, repository),
                    answer_generator,
                    answer_generator,
                    QuerySkill(request.app.state.settings, actor, repository)
                    if request.app.state.settings.query_skill_enabled
                    and answer_generator is not None
                    else None,
                    DocumentRetrieval(actor, repository),
                )
                chunks: list[str] = []
                source_ids: list[str] = []
                outcome = "completed"
                audit_metadata: dict[str, object] = {}

                try:
                    stream = orchestrator.stream(payload.message, history)
                    deadline = time.monotonic() + request.app.state.settings.request_timeout_seconds
                    while True:
                        remaining = deadline - time.monotonic()
                        if remaining <= 0:
                            raise asyncio.TimeoutError
                        try:
                            event = await asyncio.wait_for(anext(stream), timeout=remaining)
                        except StopAsyncIteration:
                            break
                        if await request.is_disconnected():
                            break
                        parsed = json.loads(event)
                        if parsed.get("type") in {"delta", "refusal"}:
                            chunks.append(parsed.get("content") or "")
                            outcome = parsed.get("code") or outcome
                        if parsed.get("type") == "citation":
                            source_id = (parsed.get("citation") or {}).get("source_id")
                            if source_id:
                                source_ids.append(source_id)
                        if parsed.get("type") == "complete" and isinstance(
                            parsed.get("metadata"), dict
                        ):
                            audit_metadata = parsed["metadata"]
                        yield f"data: {event}\n\n"
                    await store.add_message(
                        actor, thread_id, "assistant", "".join(chunks), "completed"
                    )
                    latency_ms = int((time.monotonic() - started) * 1000)
                    await AuditWriter(repository).write(
                        actor,
                        tool_name=outcome,
                        source_ids=source_ids,
                        latency_ms=latency_ms,
                        status="refused" if outcome.endswith("denied") else "completed",
                        safe_parameters=audit_metadata or None,
                    )
                    request.app.state.metrics.increment("assistant_completed")
                    request.app.state.metrics.increment(f"tool_{outcome}")
                    query_status = audit_metadata.get("status")
                    if isinstance(query_status, str):
                        request.app.state.metrics.increment(f"query_{query_status}")
                    relations = audit_metadata.get("relations")
                    if isinstance(relations, list):
                        for relation in relations[:6]:
                            if isinstance(relation, str):
                                request.app.state.metrics.increment(f"query_relation_{relation}")
                except asyncio.TimeoutError:
                    request.app.state.metrics.increment("assistant_timeout")
                    yield (
                        "data: "
                        + json.dumps(
                            {
                                "type": "error",
                                "correlationId": str(actor.correlation_id),
                                "code": "timeout",
                                "retryable": True,
                            }
                        )
                        + "\n\n"
                    )
        except RateLimitExceeded:
            request.app.state.metrics.increment("assistant_rate_limited")
            yield (
                "data: "
                + json.dumps(
                    {
                        "type": "error",
                        "correlationId": str(actor.correlation_id),
                        "code": "rate_limit",
                        "retryable": True,
                    }
                )
                + "\n\n"
            )
        finally:
            request.app.state.metrics.increment("assistant_requests")
            request.app.state.last_latency_ms = int((time.monotonic() - started) * 1000)
            await repository.close()

    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.")
    return StreamingResponse(events(), media_type="text/event-stream")
