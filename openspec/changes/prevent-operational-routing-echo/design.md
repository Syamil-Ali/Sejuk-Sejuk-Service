## Context

See `proposal.md` for motivation. The assistant uses a Gemini-backed structured planner that returns an intent, one allow-listed tool, and an optional direct response. The orchestrator currently accepts any `tool: none` plan with non-empty response, so a model classification error bypasses data retrieval entirely. Authentication, capability filtering, query validation, and row-level scoping already operate after tool selection and must remain unchanged.

## Goals / Non-Goals

**Goals:**

- Enforce consistency between structured intent and tool selection.
- Detect the observed unanswered-question echo without classifying requests through hardcoded business keywords.
- Retry a bad plan once with explicit correction context.
- Preserve no-tool handling for genuine casual conversation and out-of-scope requests.

**Non-Goals:**

- Replacing the planner with keyword routing.
- Relaxing authorization or SQL validation.
- Retrying database execution failures.
- Adding a separate classification model or another provider request on valid plans.

## Decisions

### Validate completed plans outside the output schema

Add a small plan-quality validator after the structured response is parsed. It will reject `none` for operational or organization-knowledge intent and detect when the normalized latest question appears in the proposed no-tool response. Keeping this outside Pydantic output parsing allows the application to issue a controlled corrective retry rather than surfacing a schema exception. A keyword-to-tool map was rejected because it recreates the brittle routing removed earlier.

### Retry the same planner once with correction context

The planner will receive the original prompt plus a concise statement describing why its previous structured plan was invalid. One retry bounds latency and cost while allowing the model to select among the caller's already filtered tools. If the retry remains invalid, the planner layer will return a safe out-of-scope/no-tool plan with a fixed inability response; it will not guess a tool or operational answer.

### Improve semantic tool guidance with examples

Planner instructions will explicitly distinguish aggregate workforce questions, staff-list questions, and named-member questions. Counts and cross-record analytics use the analytical query tool; member lookup uses the staff directory. These are semantic examples for model planning, not runtime keyword branches.

### Test at planner and orchestrator boundaries

Unit tests will use deterministic fake model responses to prove retry behavior, bounded retries, valid casual handling, and routing outcomes for representative workforce questions. Existing security tests remain the authority for permission filtering and query safety.

## Risks / Trade-offs

- [Invalid plans incur a second model call] -> Retry only failed no-tool plans and cap retries at one.
- [Text normalization can flag a legitimate response quoting the user] -> Apply echo detection only to no-tool responses and require meaningful normalized question containment.
- [A second model response can still be wrong] -> Fail closed with no operational claim after the bounded retry.
- [Prompt examples can overfit phrasing] -> Cover paraphrases in regression tests and keep runtime routing model-driven.

## Migration Plan

Deploy the planner validator, corrective retry, and prompt guidance together. Run backend unit and security tests, then manually verify workforce count, staff list, named role, and greeting conversations. Rollback is limited to the planner changes and tests; no data or API migration is required.
