from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from sejuk_assistant.main import create_app
from sejuk_assistant.settings import Settings


def test_liveness_is_sanitized() -> None:
    client = TestClient(create_app(Settings(environment="test", _env_file=None)))
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}


def test_readiness_reports_dependency_names_without_values() -> None:
    secret = "never-return-this-key"
    settings = Settings(
        environment="test",
        model_provider="openai",
        openai_api_key=secret,
        _env_file=None,
    )
    response = TestClient(create_app(settings)).get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "dependencies": {"database": "unavailable", "model": "configured"},
    }
    assert secret not in response.text


def test_readiness_succeeds_when_required_dependencies_are_configured() -> None:
    settings = Settings(
        environment="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="test-anon-key",
        supabase_jwt_issuer="https://example.supabase.co/auth/v1",
        openai_api_key="test-only-key",
        model_provider="openai",
        _env_file=None,
    )
    response = TestClient(create_app(settings)).get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_invalid_configuration_fails_validation() -> None:
    with pytest.raises(ValidationError):
        Settings(
            environment="test",
            port=0,
            request_timeout_seconds=0,
            _env_file=None,
        )


def test_production_disables_interactive_schema_pages() -> None:
    client = TestClient(create_app(Settings(environment="production", _env_file=None)))
    assert client.get("/docs").status_code == 404
