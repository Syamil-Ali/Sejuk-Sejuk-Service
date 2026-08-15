from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID, uuid4

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.auth.jwt import AuthenticationError, VerifiedIdentity


@dataclass(frozen=True, slots=True)
class ProfileRecord:
    user_id: UUID
    role: Role
    branch_id: UUID | None
    display_name: str
    active: bool


class ProfileRepository(Protocol):
    async def get_profile(self, user_id: UUID, access_token: str) -> ProfileRecord | None: ...


class ActorResolver:
    def __init__(self, profiles: ProfileRepository) -> None:
        self._profiles = profiles

    async def resolve(
        self,
        identity: VerifiedIdentity,
        access_token: str,
        correlation_id: UUID | None = None,
    ) -> ActorContext:
        profile = await self._profiles.get_profile(identity.user_id, access_token)
        if profile is None or not profile.active or profile.user_id != identity.user_id:
            raise AuthenticationError("Authentication required.")
        return ActorContext(
            user_id=profile.user_id,
            role=profile.role,
            branch_id=profile.branch_id,
            display_name=profile.display_name,
            correlation_id=correlation_id or uuid4(),
        )


ProfileFetcher = Callable[[UUID, str], Awaitable[ProfileRecord | None]]
