from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from uuid import UUID

import httpx

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.auth.profiles import ProfileRecord
from sejuk_assistant.settings import Settings


class RepositoryError(Exception):
    """Sanitized repository failure."""

    def __init__(self, message: str, code: str = "data_unavailable") -> None:
        super().__init__(message)
        self.code = code


class CallerSupabaseRepository:
    """Supabase REST client that always executes as the authenticated caller."""

    def __init__(
        self,
        settings: Settings,
        access_token: str,
        actor: ActorContext | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if settings.supabase_url is None or not settings.supabase_anon_key:
            raise ValueError("Supabase URL and anon key are required.")
        self.actor = actor
        self._client = httpx.AsyncClient(
            base_url=f"{str(settings.supabase_url).rstrip('/')}/rest/v1/",
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": settings.supabase_anon_key,
                "Accept": "application/json",
            },
            timeout=settings.request_timeout_seconds,
            transport=transport,
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def get_profile(self, user_id: UUID, access_token: str) -> ProfileRecord | None:
        del access_token
        rows = await self.get(
            "profiles",
            {
                "select": "id,display_name,role,branch_id,active",
                "id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if not rows:
            return None
        row = rows[0]
        return ProfileRecord(
            user_id=UUID(row["id"]),
            display_name=row["display_name"],
            role=Role(row["role"]),
            branch_id=UUID(row["branch_id"]) if row.get("branch_id") else None,
            active=bool(row["active"]),
        )

    async def get(self, path: str, params: Mapping[str, str]) -> list[dict[str, Any]]:
        response = await self._client.get(path, params=params)
        return self._rows(response)

    async def rpc(self, function: str, payload: Mapping[str, Any]) -> Any:
        response = await self._client.post(f"rpc/{function}", json=dict(payload))
        self._raise_for_status(response)
        if not response.content:
            return None
        return response.json()

    async def insert(self, table: str, payload: Mapping[str, Any]) -> None:
        response = await self._client.post(
            table, json=dict(payload), headers={"Prefer": "return=minimal"}
        )
        self._raise_for_status(response)

    @staticmethod
    def _rows(response: httpx.Response) -> list[dict[str, Any]]:
        CallerSupabaseRepository._raise_for_status(response)
        payload = response.json()
        if not isinstance(payload, list):
            raise RepositoryError("Data service returned an invalid response.")
        return [row for row in payload if isinstance(row, dict)]

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.is_error:
            code = f"http_{response.status_code}"
            try:
                payload = response.json()
                candidate = payload.get("code") if isinstance(payload, dict) else None
                if isinstance(candidate, str) and candidate.isascii() and candidate.isalnum():
                    code = candidate[:20]
            except ValueError:
                pass
            raise RepositoryError("The requested data is unavailable.", code)
