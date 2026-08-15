from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from sejuk_assistant.auth.context import ActorContext, Role


class Capability(str, Enum):
    ORDERS_ORGANIZATION = "orders.organization"
    ORDERS_OWN = "orders.own"
    PAYMENTS_ORGANIZATION = "payments.organization"
    PAYMENTS_OWN_JOBS = "payments.own_jobs"
    PERFORMANCE_ORGANIZATION = "performance.organization"
    PERFORMANCE_OWN = "performance.own"
    REVIEWS_ORGANIZATION = "reviews.organization"
    AUDITS_ORGANIZATION = "audits.organization"
    CORRECTIONS_OWN_JOBS = "corrections.own_jobs"
    COMMUNICATIONS_ACCESSIBLE = "communications.accessible"
    DOCUMENTS_AUTHORIZED = "documents.authorized"
    ANALYTICAL_SQL = "analytics.sql"
    STAFF_DIRECTORY = "staff.directory"


ROLE_CAPABILITIES: dict[Role, frozenset[Capability]] = {
    Role.ADMIN: frozenset(
        {
            Capability.ORDERS_ORGANIZATION,
            Capability.PAYMENTS_ORGANIZATION,
            Capability.PERFORMANCE_ORGANIZATION,
            Capability.REVIEWS_ORGANIZATION,
            Capability.AUDITS_ORGANIZATION,
            Capability.COMMUNICATIONS_ACCESSIBLE,
            Capability.DOCUMENTS_AUTHORIZED,
            Capability.ANALYTICAL_SQL,
            Capability.STAFF_DIRECTORY,
        }
    ),
    Role.MANAGER: frozenset(
        {
            Capability.ORDERS_ORGANIZATION,
            Capability.PAYMENTS_ORGANIZATION,
            Capability.PERFORMANCE_ORGANIZATION,
            Capability.REVIEWS_ORGANIZATION,
            Capability.AUDITS_ORGANIZATION,
            Capability.COMMUNICATIONS_ACCESSIBLE,
            Capability.DOCUMENTS_AUTHORIZED,
            Capability.ANALYTICAL_SQL,
            Capability.STAFF_DIRECTORY,
        }
    ),
    Role.TECHNICIAN: frozenset(
        {
            Capability.ORDERS_OWN,
            Capability.PAYMENTS_OWN_JOBS,
            Capability.PERFORMANCE_OWN,
            Capability.CORRECTIONS_OWN_JOBS,
            Capability.COMMUNICATIONS_ACCESSIBLE,
            Capability.DOCUMENTS_AUTHORIZED,
            Capability.ANALYTICAL_SQL,
            Capability.STAFF_DIRECTORY,
        }
    ),
}


@dataclass(frozen=True, slots=True)
class PolicyDecision:
    allowed: bool
    capability: Capability
    code: str

    @property
    def public_message(self) -> str:
        if self.allowed:
            return "Allowed."
        return "You do not have access to that information."


def decide(actor: ActorContext, capability: Capability) -> PolicyDecision:
    allowed = capability in ROLE_CAPABILITIES[actor.role]
    return PolicyDecision(
        allowed=allowed,
        capability=capability,
        code="allowed" if allowed else "scope_denied",
    )
