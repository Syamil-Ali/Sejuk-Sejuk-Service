## Purpose

Provides each organization role with useful operational answers while enforcing the same data visibility boundaries as the rest of the application.

## ADDED Requirements

### Requirement: Every role can use the Ops Assistant
The system SHALL allow administrators, technicians, and managers to ask supported operational questions.

#### Scenario: Technician asks about tomorrow
- **WHEN** a technician asks for tomorrow's jobs
- **THEN** the assistant answers using only orders assigned to that technician

#### Scenario: Admin asks about assignments
- **WHEN** an administrator asks which orders are unassigned
- **THEN** the assistant returns matching orders the administrator is authorized to manage

#### Scenario: Manager asks organization-wide question
- **WHEN** a manager asks about workload or performance
- **THEN** the assistant can use organization-wide operational records available to managers

### Requirement: Assistant authorization is enforced before answering
The system MUST scope source records to the signed-in user's role and identity before interpreting or formatting an answer.

#### Scenario: Technician asks about another technician
- **WHEN** a technician asks for another technician's jobs, payments, or performance
- **THEN** the assistant refuses or returns no unauthorized records

### Requirement: Answers disclose their interpretation and limits
The system SHALL identify the interpreted intent, result count, relevant date range, and a clear explanation when a question is unsupported.

#### Scenario: Unsupported question
- **WHEN** a user asks a question outside the supported operational intents
- **THEN** the assistant explains what it can answer without inventing data or executing arbitrary queries

