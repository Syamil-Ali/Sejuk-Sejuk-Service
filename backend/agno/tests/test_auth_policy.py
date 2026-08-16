from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.auth.jwt import AuthenticationError, TokenVerifier, VerifiedIdentity
from sejuk_assistant.auth.policy import ROLE_CAPABILITIES, Capability, decide
from sejuk_assistant.auth.profiles import ActorResolver, ProfileRecord
from sejuk_assistant.settings import Settings
from sejuk_assistant.tools.registry import build_tool_registry

SECRET = "unit-test-secret-that-is-long-enough"
ISSUER = "https://example.supabase.co/auth/v1"


def token_for(user_id: str, *, expires_in: int = 300) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user_id,
            "aud": "authenticated",
            "iss": ISSUER,
            "iat": now,
            "exp": now + timedelta(seconds=expires_in),
        },
        SECRET,
        algorithm="HS256",
    )


def verifier() -> TokenVerifier:
    settings = Settings(environment="test", supabase_jwt_issuer=ISSUER)
    return TokenVerifier(settings, key_provider=lambda _: SECRET, algorithms=("HS256",))


def actor(role: Role) -> ActorContext:
    return ActorContext(uuid4(), role, uuid4(), "Test user", uuid4())


def test_token_verification_checks_signature_issuer_audience_expiry_and_subject() -> None:
    user_id = uuid4()
    assert verifier().verify(token_for(str(user_id))).user_id == user_id
    with pytest.raises(AuthenticationError):
        verifier().verify("")
    with pytest.raises(AuthenticationError):
        verifier().verify(token_for(str(user_id), expires_in=-1))
    forged = jwt.encode(
        {"sub": str(user_id), "aud": "authenticated", "iss": ISSUER, "iat": 1, "exp": 9999999999},
        "wrong-secret-that-is-also-long-enough",
        algorithm="HS256",
    )
    with pytest.raises(AuthenticationError):
        verifier().verify(forged)


class FakeProfiles:
    def __init__(self, profile: ProfileRecord | None) -> None:
        self.profile = profile

    async def get_profile(self, user_id: object, access_token: str) -> ProfileRecord | None:
        del user_id, access_token
        return self.profile


@pytest.mark.asyncio
async def test_actor_is_derived_from_active_profile_not_client_claims() -> None:
    user_id = uuid4()
    profile = ProfileRecord(user_id, Role.TECHNICIAN, uuid4(), "Ali", True)
    resolved = await ActorResolver(FakeProfiles(profile)).resolve(
        VerifiedIdentity(user_id), "token", uuid4()
    )
    assert resolved.role is Role.TECHNICIAN
    assert resolved.display_name == "Ali"


@pytest.mark.asyncio
async def test_inactive_or_mismatched_profile_is_rejected() -> None:
    user_id = uuid4()
    for profile in (
        ProfileRecord(user_id, Role.TECHNICIAN, None, "Ali", False),
        ProfileRecord(uuid4(), Role.MANAGER, None, "Forged", True),
        None,
    ):
        with pytest.raises(AuthenticationError):
            await ActorResolver(FakeProfiles(profile)).resolve(VerifiedIdentity(user_id), "token")


@pytest.mark.parametrize("role", list(Role))
def test_registry_exactly_matches_role_matrix_and_is_read_only(role: Role) -> None:
    registry = build_tool_registry(actor(role))
    assert {tool.capability for tool in registry} == ROLE_CAPABILITIES[role]
    assert all(tool.read_only for tool in registry)


def test_technician_cannot_access_other_technician_or_organization_capabilities() -> None:
    technician = actor(Role.TECHNICIAN)
    protected = (
        Capability.ORDERS_ORGANIZATION,
        Capability.PAYMENTS_ORGANIZATION,
        Capability.PERFORMANCE_ORGANIZATION,
        Capability.AUDITS_ORGANIZATION,
    )
    for capability in protected:
        decision = decide(technician, capability)
        assert not decision.allowed
        assert decision.code == "scope_denied"
        assert "exist" not in decision.public_message.lower()


def test_admin_and_manager_have_organization_analytics() -> None:
    for role in (Role.ADMIN, Role.MANAGER):
        assert decide(actor(role), Capability.ORDERS_ORGANIZATION).allowed
        assert decide(actor(role), Capability.PERFORMANCE_ORGANIZATION).allowed
