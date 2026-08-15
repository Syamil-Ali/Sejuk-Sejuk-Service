from __future__ import annotations

from dataclasses import dataclass

from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.auth.policy import ROLE_CAPABILITIES, Capability


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    name: str
    capability: Capability
    read_only: bool = True


TOOLS: tuple[ToolDefinition, ...] = (
    ToolDefinition("search_orders", Capability.ORDERS_ORGANIZATION),
    ToolDefinition("search_own_orders", Capability.ORDERS_OWN),
    ToolDefinition("summarize_postponements", Capability.ORDERS_ORGANIZATION),
    ToolDefinition("summarize_own_postponements", Capability.ORDERS_OWN),
    ToolDefinition("summarize_payments", Capability.PAYMENTS_ORGANIZATION),
    ToolDefinition("summarize_own_job_payments", Capability.PAYMENTS_OWN_JOBS),
    ToolDefinition("compare_technician_performance", Capability.PERFORMANCE_ORGANIZATION),
    ToolDefinition("summarize_own_performance", Capability.PERFORMANCE_OWN),
    ToolDefinition("search_reviews", Capability.REVIEWS_ORGANIZATION),
    ToolDefinition("search_audit_history", Capability.AUDITS_ORGANIZATION),
    ToolDefinition("search_own_corrections", Capability.CORRECTIONS_OWN_JOBS),
    ToolDefinition("search_accessible_messages", Capability.COMMUNICATIONS_ACCESSIBLE),
    ToolDefinition("search_authorized_documents", Capability.DOCUMENTS_AUTHORIZED),
    ToolDefinition("search_staff_directory", Capability.STAFF_DIRECTORY),
    ToolDefinition("consult_organization_handbook", Capability.DOCUMENTS_AUTHORIZED),
    ToolDefinition("query_operational_data", Capability.ANALYTICAL_SQL),
)


def build_tool_registry(actor: ActorContext) -> tuple[ToolDefinition, ...]:
    capabilities = ROLE_CAPABILITIES[actor.role]
    registry = tuple(tool for tool in TOOLS if tool.capability in capabilities)
    if any(not tool.read_only for tool in registry):
        raise RuntimeError("Write tools are disabled for the first release.")
    return registry
