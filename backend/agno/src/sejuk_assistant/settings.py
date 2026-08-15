from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated configuration. Secret values are never returned by health endpoints."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="SEJUK_",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "test", "production"] = "development"
    host: str = "0.0.0.0"
    port: int = Field(default=8000, ge=1, le=65535)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    supabase_url: HttpUrl | None = None
    supabase_anon_key: str | None = Field(default=None, repr=False)
    supabase_service_role_key: str | None = Field(default=None, repr=False)
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_issuer: HttpUrl | None = None
    supabase_jwks_url: HttpUrl | None = None
    openai_api_key: str | None = Field(default=None, repr=False)
    openai_model: str = "gpt-5-mini"
    model_provider: Literal["gemini", "openai"] = "gemini"
    model_id: str = "gemini-2.5-flash"
    google_api_key: str | None = Field(
        default=None,
        repr=False,
        validation_alias=AliasChoices("GOOGLE_API_KEY", "SEJUK_GOOGLE_API_KEY"),
    )
    request_timeout_seconds: int = Field(default=30, ge=1, le=120)
    requests_per_minute: int = Field(default=10, ge=1, le=120)
    max_concurrent_requests: int = Field(default=2, ge=1, le=10)
    conversation_retention_days: int = Field(default=90, ge=1, le=3650)
    audit_retention_days: int = Field(default=365, ge=1, le=3650)
    query_skill_enabled: bool = False
    query_statement_timeout_ms: int = Field(default=3_000, ge=100, le=15_000)
    query_max_rows: int = Field(default=100, ge=1, le=500)
    query_max_bytes: int = Field(default=65_536, ge=1_024, le=1_048_576)
    query_max_joins: int = Field(default=6, ge=0, le=12)
    query_max_nesting: int = Field(default=6, ge=1, le=12)
    query_max_date_range_days: int = Field(default=366, ge=1, le=366)
    semantic_profile_enabled: bool = True
    semantic_profile_snapshot_path: Path | None = None
    semantic_profile_prompt_max_bytes: int = Field(default=14_000, ge=4_000, le=64_000)
    semantic_profile_fail_on_drift: bool = True
    semantic_profile_verify_database: bool = False
    data_profile_enabled: bool = False
    data_profile_cache_ttl_seconds: int = Field(default=60, ge=10, le=3600)

    @property
    def dependency_configuration(self) -> dict[str, bool]:
        return {
            "database": all(
                (
                    self.supabase_url is not None,
                    self.supabase_jwt_issuer is not None,
                    self.supabase_anon_key,
                )
            ),
            "model": bool(
                self.google_api_key if self.model_provider == "gemini" else self.openai_api_key
            ),
        }

    @property
    def resolved_jwks_url(self) -> str | None:
        if self.supabase_jwks_url is not None:
            return str(self.supabase_jwks_url)
        if self.supabase_url is None:
            return None
        return f"{str(self.supabase_url).rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
