## Purpose

Let managers ask common operational questions in natural language while ensuring every answer is grounded in controlled, structured application data.

## ADDED Requirements

### Requirement: Assistant access is manager only
The system MUST allow only authenticated Managers to submit operational questions or view their assistant results.

#### Scenario: Technician calls assistant endpoint
- **WHEN** a Technician directly submits a question to the operations assistant
- **THEN** the system rejects the request without executing an operational query

### Requirement: Questions map to allow-listed query intents
The system SHALL accept questions about jobs completed by a named technician over a supported period, technician rankings for a period, jobs completed today, and current technician workload, and MUST map questions only to predefined intents and validated parameters.

#### Scenario: Manager asks for Ali's completed jobs last week
- **WHEN** a Manager asks what jobs Technician Ali completed last week
- **THEN** the system selects the technician-completions intent with Ali and the resolved Malaysian date range and retrieves only the fields required for that intent

#### Scenario: Manager asks unsupported question
- **WHEN** a question cannot be mapped confidently to a supported intent
- **THEN** the system explains the limitation and suggests supported question examples without querying unrestricted data

### Requirement: Assistant cannot generate or execute arbitrary database queries
The system MUST execute only application-owned parameterized query functions and MUST NOT execute model-generated SQL or provide the model direct database credentials.

#### Scenario: Question requests raw database access
- **WHEN** a Manager asks the assistant to run SQL or expose an unrelated table
- **THEN** the system refuses the request and executes no arbitrary query

### Requirement: Answers are grounded and transparent
The system SHALL format answers solely from returned structured data, include the interpreted period when relevant, distinguish no results from errors, and avoid inventing missing records.

#### Scenario: Query returns matching records
- **WHEN** a controlled query succeeds with matching data
- **THEN** the response summarizes the result and lists identifying order details sufficient for the supported intent

#### Scenario: Query returns no records
- **WHEN** a controlled query succeeds with no matching data
- **THEN** the response states that no matching records were found for the interpreted filters

#### Scenario: AI provider is unavailable
- **WHEN** structured data was retrieved but the language model cannot format the response
- **THEN** the system returns a deterministic readable summary of the same data and identifies that AI formatting was unavailable

