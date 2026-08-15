## Purpose

Provides traceable, privacy-conscious operation of the assistant through audit events, correlation identifiers, availability signals, limits, and safe diagnostics.

## ADDED Requirements

### Requirement: Assistant request audit trail
The system SHALL record an audit event for each production assistant request containing the authenticated actor, correlation identifier, request time, resolved role, invoked tool names, authorization outcome, source identifiers, latency, completion status, and safe error code.

#### Scenario: Successful request is audited
- **WHEN** an assistant request completes successfully
- **THEN** an audit record links the caller, tools, authorized sources, latency, and successful outcome under one correlation identifier

#### Scenario: Denied request is audited
- **WHEN** a request or tool invocation is denied by policy
- **THEN** the audit record captures the denied capability and policy outcome without storing the protected result

### Requirement: Privacy-conscious logging
The system SHALL NOT place access tokens, provider keys, database credentials, raw private documents, full retrieved datasets, or unrestricted message bodies in operational logs.

#### Scenario: Service error includes sensitive context
- **WHEN** an internal exception contains a credential, query result, or document excerpt
- **THEN** the externally returned error and operational log contain only a sanitized error code and correlation identifier

#### Scenario: Operators inspect an audit event
- **WHEN** an authorized operator reviews assistant activity
- **THEN** the event contains enough metadata to reconstruct the authorization and tool path without exposing secrets or unnecessary source content

### Requirement: Audit visibility follows role policy
Assistant audit records SHALL be accessible only to explicitly authorized operational roles and SHALL not expose one user's prompts or activity to ordinary Technicians.

#### Scenario: Technician requests assistant audit records
- **WHEN** a Technician attempts to access assistant audit data
- **THEN** the system denies access except for any intentionally exposed personal conversation history

#### Scenario: Authorized manager investigates an incident
- **WHEN** an authorized Manager investigates a reported answer using its correlation identifier
- **THEN** the Manager can inspect the permitted audit metadata and cited sources needed to understand the result

### Requirement: Service health and dependency readiness
The assistant service SHALL provide separate liveness and readiness signals without exposing configuration values or dependency credentials.

#### Scenario: Process is alive but retrieval is unavailable
- **WHEN** the HTTP process runs but a required database or model dependency is unavailable
- **THEN** liveness remains successful while readiness reports unavailable with sanitized dependency status

#### Scenario: Health endpoint is queried
- **WHEN** infrastructure checks service health
- **THEN** the response contains no secrets, internal prompts, document content, or user data

### Requirement: Abuse and resource limits
The system SHALL enforce per-user request rate limits, concurrency limits, message-size limits, retrieval bounds, and execution deadlines.

#### Scenario: User exceeds request rate
- **WHEN** a user exceeds the configured request allowance
- **THEN** the service rejects additional requests temporarily with a retryable rate-limit response and no model invocation

#### Scenario: Tool exceeds execution deadline
- **WHEN** a retrieval or model operation exceeds its configured deadline
- **THEN** the service cancels or abandons the operation, records a timeout outcome, and returns a safe retryable error

### Requirement: Conversation and audit retention
The system SHALL apply configurable retention periods to assistant conversations, traces, and source references and SHALL remove or anonymize expired records according to organizational policy.

#### Scenario: Retention period expires
- **WHEN** an assistant record reaches the configured retention boundary
- **THEN** the system deletes or anonymizes the record while preserving only legally or operationally required aggregate metadata

