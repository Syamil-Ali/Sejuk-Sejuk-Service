from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import jwt
from jwt import PyJWKClient

from sejuk_assistant.settings import Settings


class AuthenticationError(Exception):
    """A permission-safe authentication failure."""


@dataclass(frozen=True, slots=True)
class VerifiedIdentity:
    user_id: UUID


SigningKeyProvider = Callable[[str], Any]


class TokenVerifier:
    def __init__(
        self,
        settings: Settings,
        key_provider: SigningKeyProvider | None = None,
        algorithms: tuple[str, ...] = ("RS256", "ES256"),
    ) -> None:
        if settings.supabase_jwt_issuer is None:
            raise ValueError("Supabase JWT issuer is required.")
        self._issuer = str(settings.supabase_jwt_issuer).rstrip("/")
        self._audience = settings.supabase_jwt_audience
        self._algorithms = algorithms
        if key_provider is None:
            if settings.resolved_jwks_url is None:
                raise ValueError("Supabase JWKS URL is required.")
            jwks = PyJWKClient(settings.resolved_jwks_url)

            def jwks_key_provider(token: str) -> Any:
                return jwks.get_signing_key_from_jwt(token).key

            key_provider = jwks_key_provider
        self._key_provider = key_provider

    def verify(self, token: str) -> VerifiedIdentity:
        if not token or token.count(".") != 2:
            raise AuthenticationError("Authentication required.")
        try:
            payload = jwt.decode(
                token,
                key=self._key_provider(token),
                algorithms=list(self._algorithms),
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["exp", "iat", "sub", "aud", "iss"]},
            )
            return VerifiedIdentity(user_id=UUID(str(payload["sub"])))
        except (jwt.PyJWTError, KeyError, TypeError, ValueError) as error:
            raise AuthenticationError("Authentication required.") from error
