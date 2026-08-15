from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from uuid import UUID


class Role(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"


@dataclass(frozen=True, slots=True)
class ActorContext:
    user_id: UUID
    role: Role
    branch_id: UUID | None
    display_name: str
    correlation_id: UUID
