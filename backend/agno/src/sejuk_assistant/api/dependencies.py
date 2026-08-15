from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException, Request, status

from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.auth.jwt import AuthenticationError, TokenVerifier
from sejuk_assistant.auth.profiles import ActorResolver
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository


async def authenticated_actor(
    request: Request,
    authorization: str | None = Header(default=None),
    x_correlation_id: str | None = Header(default=None),
) -> ActorContext:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.")
    token = authorization.removeprefix("Bearer ").strip()
    repository = CallerSupabaseRepository(request.app.state.settings, token)
    try:
        identity = TokenVerifier(request.app.state.settings).verify(token)
        correlation = UUID(x_correlation_id) if x_correlation_id else None
        return await ActorResolver(repository).resolve(identity, token, correlation)
    except (AuthenticationError, ValueError) as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required.") from error
    finally:
        await repository.close()
