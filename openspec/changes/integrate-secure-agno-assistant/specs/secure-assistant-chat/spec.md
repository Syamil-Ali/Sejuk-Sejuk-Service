## Purpose

Provides authenticated Sejuk Ops users with a conversational, read-only assistant whose answers and available capabilities are constrained by the caller's verified organizational role.

## ADDED Requirements

### Requirement: Authenticated assistant access
The system SHALL require a valid, active Supabase user session for every production assistant request and SHALL derive the user's identity, role, and branch from trusted server-side records.

#### Scenario: Active user starts a chat
- **WHEN** an active Admin, Manager, or Technician submits a message with a valid session
- **THEN** the system accepts the request using the server-resolved identity and authorization context

#### Scenario: Unauthenticated request
- **WHEN** a request has no valid session or carries an expired or invalid token
- **THEN** the system rejects it without invoking the model or any retrieval tool

#### Scenario: Client supplies conflicting identity
- **WHEN** the request body or prompt claims a different role, user identifier, or branch than the authenticated session
- **THEN** the system ignores the claimed identity and uses only the trusted server-resolved context

### Requirement: Role-aware conversational answers
The system SHALL answer supported questions using only tools and records authorized for the caller and SHALL not treat model instructions as authorization decisions.

#### Scenario: Manager asks organization-wide question
- **WHEN** a Manager asks for technician rankings or organization-wide operational performance
- **THEN** the assistant returns an answer based on authorized organization-wide records

#### Scenario: Technician asks about own work
- **WHEN** a Technician asks about their assigned jobs, completed work, payments related to their jobs, or personal performance
- **THEN** the assistant returns only records within that Technician's authorized scope

#### Scenario: Technician asks about another technician
- **WHEN** a Technician asks for another Technician's jobs, earnings, performance, payments, messages, or customer records
- **THEN** the assistant refuses the restricted portion without disclosing whether matching private records exist

### Requirement: Permission-safe refusals
The system SHALL provide a clear refusal when a request is outside the caller's permission scope and SHALL not reveal protected identifiers, values, excerpts, counts, or existence through the refusal.

#### Scenario: Direct identifier manipulation
- **WHEN** a Technician supplies an order identifier assigned to another Technician
- **THEN** the assistant returns a permission-safe response and no protected order content

#### Scenario: Prompt injection requests privilege escalation
- **WHEN** a user asks the assistant to ignore policies, impersonate another role, expose system instructions, or use privileged credentials
- **THEN** the assistant retains the authenticated scope and returns no newly accessible data

### Requirement: Read-only first release
The assistant SHALL NOT create, modify, delete, assign, approve, close, postpone, pay, upload, or message on behalf of a user in the first release.

#### Scenario: User requests an operational mutation
- **WHEN** a user asks the assistant to perform an order, payment, review, checklist, document, or communication mutation
- **THEN** the assistant explains that it is read-only and may direct the user to the relevant application workflow

### Requirement: Streaming and recoverable chat experience
The production assistant SHALL expose incremental response delivery and SHALL return structured errors that allow the client to preserve the conversation and retry safely.

#### Scenario: Successful streamed answer
- **WHEN** the assistant produces an authorized answer
- **THEN** the client receives incremental answer content followed by completion metadata and sources

#### Scenario: Provider or service failure
- **WHEN** the model provider, retrieval layer, or Agno service fails
- **THEN** the client displays a non-destructive error, retains the submitted question, and offers a safe retry

### Requirement: Explicit demo behavior
The system SHALL distinguish production-backed answers from local deterministic demo answers.

#### Scenario: Demo mode has no Agno service
- **WHEN** the application runs in declared demo mode without configured Agno service credentials
- **THEN** the existing deterministic assistant remains available and is visibly identified as demo data

