## 1. Plan Quality Contract

- [x] 1.1 Add a plan-quality validator for intent/tool consistency and normalized unanswered-question echoes
- [x] 1.2 Add a single corrective planner retry and fail closed when the retry remains invalid
- [x] 1.3 Clarify planner guidance for workforce counts, staff lists, and named-member lookups without runtime keyword routing

## 2. Orchestration Behavior

- [x] 2.1 Ensure valid corrected plans continue through the existing caller-authorized tool registry
- [x] 2.2 Preserve no-tool responses for genuine casual conversation and existing out-of-scope handling

## 3. Regression Coverage

- [x] 3.1 Test that an echoed workforce-count response triggers exactly one retry and then invokes operational querying
- [x] 3.2 Test workforce-list and named-role tool selection examples
- [x] 3.3 Test valid greetings remain tool-free and repeated invalid plans fail closed without fabricated facts

## 4. Validation

- [x] 4.1 Run backend formatting, lint, typecheck, and focused assistant tests
- [x] 4.2 Run the complete backend test suite
