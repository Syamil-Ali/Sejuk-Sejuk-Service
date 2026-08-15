from __future__ import annotations

import httpx
import pytest

from sejuk_assistant.repositories.supabase import CallerSupabaseRepository, RepositoryError


def test_repository_retains_only_safe_error_code() -> None:
    response = httpx.Response(
        400,
        json={
            "code": "42803",
            "message": "customer private value appeared in an invalid query",
        },
    )
    with pytest.raises(RepositoryError) as captured:
        CallerSupabaseRepository._raise_for_status(response)
    assert captured.value.code == "42803"
    assert "customer private value" not in str(captured.value)


def test_repository_rejects_untrusted_error_code() -> None:
    response = httpx.Response(400, json={"code": "bad code: secret"})
    with pytest.raises(RepositoryError) as captured:
        CallerSupabaseRepository._raise_for_status(response)
    assert captured.value.code == "http_400"
