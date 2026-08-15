from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.chat.orchestrator import ChatOrchestrator
from sejuk_assistant.chat.response import (
    PLANNER_INSTRUCTIONS,
    GeminiAnswerGenerator,
    ToolPlan,
    plan_quality_issue,
)
from sejuk_assistant.repositories.models import Evidence


class SequencedAgent:
    def __init__(self, *plans: ToolPlan) -> None:
        self.plans = list(plans)
        self.prompts: list[str] = []

    async def arun(self, prompt: str) -> SimpleNamespace:
        self.prompts.append(prompt)
        return SimpleNamespace(content=self.plans.pop(0))


class QuerySkill:
    def __init__(self) -> None:
        self.questions: list[str] = []

    @staticmethod
    def extract_user_sql(message: str) -> str | None:
        del message
        return None

    async def query(self, question: str) -> Evidence:
        self.questions.append(question)
        return Evidence(
            {
                "status": "completed",
                "columns": ["technician_count"],
                "rows": [{"technician_count": 4}],
                "row_count": 1,
            },
            (),
        )


class UnusedTools:
    pass


class WorkloadTools:
    def __init__(self) -> None:
        self.calls = 0

    async def technician_workload(self, period: object) -> Evidence:
        del period
        self.calls += 1
        return Evidence(
            {"totalJobs": 3, "teamAverageJobs": 1.5, "technicians": []},
            (),
        )


def actor() -> ActorContext:
    return ActorContext(uuid4(), Role.MANAGER, uuid4(), "Farah", uuid4())


def generator_with(*plans: ToolPlan) -> tuple[GeminiAnswerGenerator, SequencedAgent]:
    generator = GeminiAnswerGenerator.__new__(GeminiAnswerGenerator)
    generator.semantic_profile = None
    planner = SequencedAgent(*plans)
    generator.planner = planner  # type: ignore[assignment]
    return generator, planner


def test_plan_quality_rejects_operational_none_and_question_echo() -> None:
    assert plan_quality_issue(
        "How many technicians do we have?",
        ToolPlan(intent="operational", tool="none", response=""),
    )
    assert plan_quality_issue(
        "How many technicians do we have?",
        ToolPlan(
            intent="casual",
            tool="none",
            response="I can help. How many technicians do we have?",
        ),
    )
    assert (
        plan_quality_issue(
            "Hello",
            ToolPlan(intent="casual", tool="none", response="Hi! How can I help?"),
        )
        is None
    )


@pytest.mark.asyncio
async def test_echoed_workforce_count_retries_once_and_executes_authorized_query() -> None:
    generator, planner = generator_with(
        ToolPlan(
            intent="casual",
            tool="none",
            response="I can help with that. How many technicians do we have?",
        ),
        ToolPlan(intent="operational", tool="query_operational_data", response=""),
    )
    query_skill = QuerySkill()
    _, evidence, outcome = await ChatOrchestrator(
        actor(),
        UnusedTools(),  # type: ignore[arg-type]
        tool_planner=generator,
        query_skill=query_skill,  # type: ignore[arg-type]
    ).answer("How many technicians do we have?")

    assert len(planner.prompts) == 2
    assert "CORRECTION REQUIRED" in planner.prompts[1]
    assert outcome == "query_operational_data"
    assert evidence.data["rows"] == [{"technician_count": 4}]
    assert query_skill.questions == ["How many technicians do we have?"]


@pytest.mark.asyncio
async def test_workload_plan_routes_to_workload_tool() -> None:
    generator, planner = generator_with(
        ToolPlan(intent="operational", tool="compare_technician_workload", response=""),
    )
    tools = WorkloadTools()
    _, evidence, outcome = await ChatOrchestrator(
        actor(),
        tools,  # type: ignore[arg-type]
        tool_planner=generator,
    ).answer("Which technician might be overloaded this week?")
    assert len(planner.prompts) == 1
    assert outcome == "compare_technician_workload"
    assert evidence.data["totalJobs"] == 3
    assert evidence.data["teamAverageJobs"] == 1.5
    assert tools.calls == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("question", "tool"),
    [
        ("Who are all our technicians?", "query_operational_data"),
        ("What role is Farah?", "search_staff_directory"),
    ],
)
async def test_valid_workforce_and_named_member_plans_are_preserved(
    question: str, tool: str
) -> None:
    generator, planner = generator_with(
        ToolPlan(intent="operational", tool=tool, response="")  # type: ignore[arg-type]
    )
    result = await generator.plan(
        question,
        actor(),
        ("query_operational_data", "search_staff_directory"),
    )
    assert result.tool == tool
    assert len(planner.prompts) == 1


@pytest.mark.asyncio
async def test_greeting_remains_tool_free_without_retry() -> None:
    generator, planner = generator_with(
        ToolPlan(intent="casual", tool="none", response="Hi! How can I help?")
    )
    result = await generator.plan("Hello", actor(), ("query_operational_data",))
    assert result.response == "Hi! How can I help?"
    assert len(planner.prompts) == 1


@pytest.mark.asyncio
async def test_second_invalid_plan_fails_closed_after_one_retry() -> None:
    invalid = ToolPlan(intent="operational", tool="none", response="")
    generator, planner = generator_with(invalid, invalid)
    result = await generator.plan(
        "How many admins are there?", actor(), ("query_operational_data",)
    )
    assert result.tool == "none"
    assert "couldn't determine which authorized source" in result.response
    assert len(planner.prompts) == 2


def test_planner_guidance_covers_workforce_semantics() -> None:
    guidance = " ".join(PLANNER_INSTRUCTIONS)
    assert "aggregate workforce questions" in guidance
    assert "staff lists" in guidance
    assert "one named organization member" in guidance
