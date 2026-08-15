## Why

The assistant can misclassify a straightforward operational question as casual conversation, return `tool: none`, and repeat the user's question instead of consulting authorized data. This makes valid questions appear unsupported even though the required read-only tools are available.

## What Changes

- Tighten the structured planning contract so operational and organization-knowledge intents cannot produce a no-tool response.
- Validate no-tool plans before returning them and retry planning once when the proposed response merely repeats, rephrases, or leaves the user's question unanswered.
- Clarify that workforce totals and operational counts require authorized data, while questions about a particular staff member use the staff directory.
- Preserve model-driven routing and avoid hardcoded keyword-to-tool rules.
- Add regression coverage for workforce counts, staff lists, individual roles, greetings, and invalid no-tool plans.

## Capabilities

### New Capabilities

- `assistant-tool-routing-reliability`: Defines reliable, permission-scoped tool selection for operational questions and safe recovery from invalid no-tool plans.

### Modified Capabilities

None.

## Impact

- Affects the Agno assistant planner, orchestration validation, and backend tests.
- Does not change authentication, SQL safety validation, database permissions, or tool authorization.
- May add one model-planning retry only when the first no-tool plan is invalid.
