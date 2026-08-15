## Purpose

Ensure operational questions reach permission-scoped read-only tools and never escape as unanswered or echoed casual responses.

## ADDED Requirements

### Requirement: Operational facts require an authorized tool
The assistant SHALL use an allowed, permission-scoped tool before answering questions that require current Sejuk operational or organization data.

#### Scenario: User asks for a workforce count
- **WHEN** an authorized user asks how many technicians or other organization members exist
- **THEN** the assistant obtains the count from an authorized data tool and answers with the verified result

#### Scenario: User asks for a staff list
- **WHEN** an authorized user asks who the organization's technicians are
- **THEN** the assistant obtains the accessible staff records before listing them

#### Scenario: User asks about one staff member
- **WHEN** an authorized user asks for a named staff member's role or branch
- **THEN** the assistant uses the authorized staff directory and respects the caller's permissions

### Requirement: Invalid no-tool plans are recovered safely
The assistant SHALL reject a no-tool plan that is inconsistent with its declared operational intent or whose proposed response repeats the user's unanswered question, and SHALL retry planning at most once.

#### Scenario: Planner repeats the question
- **WHEN** the first plan selects no tool and proposes a response containing a normalized repetition of the latest user question
- **THEN** the assistant retries planning once with correction context instead of returning that response

#### Scenario: Operational intent selects no tool
- **WHEN** a plan classifies the request as operational or organization knowledge but selects no tool
- **THEN** the assistant treats the plan as invalid and retries planning once

#### Scenario: Corrected plan remains invalid
- **WHEN** the one permitted retry still produces an invalid no-tool plan
- **THEN** the assistant returns a safe inability response without fabricating operational facts

### Requirement: Casual conversation remains tool-free
The assistant SHALL answer greetings, thanks, acknowledgements, and conversation closure without querying operational data.

#### Scenario: User sends a greeting
- **WHEN** the user sends a greeting that requires no Sejuk facts
- **THEN** the assistant answers briefly without invoking an operational tool

### Requirement: Routing remains model-driven
The assistant MUST NOT map domain keywords directly to fixed tools as a substitute for structured planning.

#### Scenario: Operational wording varies
- **WHEN** users phrase equivalent operational questions differently
- **THEN** structured intent and tool planning determines the authorized operation without a keyword routing table
