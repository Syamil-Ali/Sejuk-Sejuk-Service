## Purpose

Defines permission-preserving retrieval and analytics over operational records and organization documents, ensuring every factual answer is scoped, traceable, and resistant to cross-user leakage.

## ADDED Requirements

### Requirement: Defense-in-depth operational retrieval
The system SHALL enforce authorization through server-selected tools, mandatory caller scope, and database policies or authorized read functions before operational data reaches the model.

#### Scenario: Technician tool call omits assignee filter
- **WHEN** a generated tool request omits or changes the authenticated Technician's identifier
- **THEN** the trusted retrieval layer applies the authenticated Technician scope before querying data

#### Scenario: Privileged role retrieves broad analytics
- **WHEN** an Admin or Manager invokes an authorized organization-wide analytical question
- **THEN** the retrieval layer returns only the fields and aggregation granularity needed to answer that question

#### Scenario: Retrieval authorization fails
- **WHEN** any underlying query is rejected by authorization controls
- **THEN** the system returns no partial protected result to the model or caller

### Requirement: Defined role data matrix
The system SHALL apply a documented and testable data-access matrix to all assistant retrieval.

#### Scenario: Admin data access
- **WHEN** an Admin asks an operational question
- **THEN** the assistant may retrieve organization-wide orders, assignments, payment status, and operational summaries but only documents allowed for Admin visibility

#### Scenario: Manager data access
- **WHEN** a Manager asks an operational or performance question
- **THEN** the assistant may retrieve organization-wide jobs, technician analytics, reviews, outstanding amounts, audit history, and Manager-visible documents

#### Scenario: Technician data access
- **WHEN** a Technician asks an operational question
- **THEN** retrieval is limited to that Technician's profile, assigned orders, related checklist and completion data, related payments and schedule events, accessible conversation content, and Technician-visible documents

### Requirement: Authorized document retrieval
The system SHALL associate every indexed document and chunk with visibility metadata and SHALL filter candidate chunks by the caller's authorization before semantic or keyword results are supplied to the model.

#### Scenario: Organization-wide technician guide
- **WHEN** a Technician asks a question answered by a document marked visible to all active users
- **THEN** the assistant may retrieve and cite the relevant authorized excerpt

#### Scenario: Manager-only document
- **WHEN** a Technician's query semantically matches a Manager-only document
- **THEN** the document and its chunks are excluded before ranking and no excerpt or existence signal is returned

#### Scenario: Document access changes
- **WHEN** an administrator changes a document's visibility or archives the document
- **THEN** subsequent retrieval reflects the new access policy without relying on stale model memory

### Requirement: Supported document lifecycle
The system SHALL accept only configured document formats and size limits, record ingestion status, and prevent failed, quarantined, or archived documents from appearing in answers.

#### Scenario: Supported document ingested
- **WHEN** an authorized ingestion process receives a supported document
- **THEN** the system extracts text, creates retrievable chunks, retains source metadata, and marks the document ready only after successful indexing

#### Scenario: Unsupported or failed document
- **WHEN** extraction, validation, malware policy, or indexing fails
- **THEN** the system records the failure and excludes all associated content from retrieval

### Requirement: Citation-backed factual answers
The assistant SHALL attach citations to material factual claims derived from operational records or documents and SHALL identify the source type and freshness time.

#### Scenario: Answer uses an order record
- **WHEN** the assistant states an order status, payment amount, assignment, or schedule
- **THEN** the response includes an authorized application link or stable source reference and the data retrieval time

#### Scenario: Answer uses a document
- **WHEN** the assistant answers from indexed document content
- **THEN** the response identifies the document and relevant page, section, or chunk location available to the caller

#### Scenario: Evidence is insufficient
- **WHEN** authorized sources do not support a confident answer
- **THEN** the assistant states that it cannot verify the answer rather than fabricating a result

### Requirement: Safe analytics execution
Analytics SHALL run through allow-listed, parameterized tools or approved read-only views/functions and SHALL enforce row limits, time limits, and output minimization.

#### Scenario: User asks for a supported aggregation
- **WHEN** an authorized user asks for a count, total, trend, ranking, comparison, or date-filtered operational summary
- **THEN** a bounded analytical tool computes the result within that user's data scope

#### Scenario: User requests arbitrary SQL
- **WHEN** a user asks to execute SQL or attempts to embed SQL in a question
- **THEN** the system refuses arbitrary database execution and does not expose a general SQL tool

#### Scenario: Oversized result
- **WHEN** a tool result exceeds configured record or token limits
- **THEN** the system aggregates, truncates, or asks the user to narrow the request without sending the oversized dataset to the model

### Requirement: Conversation context cannot expand access
The system SHALL reauthorize every retrieval independently of earlier messages and SHALL treat retrieved content as untrusted input rather than instructions.

#### Scenario: Conversation changes subject to protected user
- **WHEN** an authorized answer about the caller's data is followed by a request about a protected user
- **THEN** the new retrieval is evaluated against the current caller's scope and denied where required

#### Scenario: Retrieved document contains instructions
- **WHEN** a document contains text instructing the agent to reveal secrets, change roles, or invoke unauthorized tools
- **THEN** the text is treated only as source content and cannot alter authorization or tool policy

