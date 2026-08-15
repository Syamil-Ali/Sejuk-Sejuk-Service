## Purpose

Provides a verified structural and business-semantic profile that grounds generated analytical SQL in the actual Supabase schema and Sejuk Ops domain definitions.

## ADDED Requirements

### Requirement: Complete profile for query-visible relations
The system SHALL maintain a versioned profile for every relation exposed to analytical SQL. The profile MUST identify relation purpose, columns, PostgreSQL data types, nullability, keys, enum values, relationships, join cardinality, timestamp semantics, and role-sensitive visibility.

#### Scenario: Planner receives an exposed relation
- **WHEN** an authenticated query is planned against an approved analytical relation
- **THEN** the planner receives the verified structural and semantic profile for that relation without receiving credentials, hidden relations, or unauthorized columns

#### Scenario: Exposed schema element lacks metadata
- **WHEN** an approved relation or column is added without the required profile metadata
- **THEN** profile validation fails before the change is enabled for analytical queries

### Requirement: Structural profile is verified against Supabase schema
The system MUST derive or verify structural facts from the authoritative Supabase migrations or database schema and SHALL detect drift in relation names, column names, types, nullability, enum values, and approved relationships.

#### Scenario: Migration changes an enum
- **WHEN** a migration changes the values of an enum used by an analytical relation
- **THEN** automated validation reports the semantic profile as stale and identifies the affected profile element

#### Scenario: Profile matches schema
- **WHEN** the generated structural profile and reviewed snapshot match the authoritative schema
- **THEN** validation succeeds deterministically without contacting the production database at user-query time

### Requirement: Reviewed business semantic overlay
The system SHALL maintain reviewed business definitions separately from generated structural facts. Definitions MUST cover lifecycle concepts, synonyms, financial meanings, ownership, preferred timestamps, and mappings from user language to stored values.

#### Scenario: User asks for open tasks
- **WHEN** a user asks for open jobs or tasks
- **THEN** the query planner maps the concept to the reviewed lifecycle values `New`, `Assigned`, and `In Progress` rather than comparing the status column to an invented `Open` value

#### Scenario: User asks for completed work
- **WHEN** a user asks for completed tasks, service value, earnings, or closed tickets
- **THEN** the planner uses the reviewed definitions to select the appropriate completion relation, lifecycle state, financial column, and timestamp for that question

### Requirement: Semantic SQL preflight validation
The system MUST validate generated SQL against the semantic profile before database execution. It SHALL reject unknown enum literals, unapproved or invalid join paths, incompatible business-field usage, and references that conflict with the profiled schema.

#### Scenario: Model invents an enum value
- **WHEN** generated SQL compares an enum-backed column to a value absent from its profile
- **THEN** the SQL is rejected before Supabase execution and one bounded repair may use a sanitized profile error category

#### Scenario: Model uses a valid profiled query
- **WHEN** generated SQL uses approved relations, columns, enum literals, joins, and bounded expressions consistent with the profile
- **THEN** the query proceeds to the existing caller-bound authorization and read-only execution boundary

### Requirement: Bounded and role-safe planner context
The profile supplied to the model MUST be limited to query-visible metadata for the authenticated role and MUST remain within a configured prompt-size budget. Profile generation SHALL NOT weaken RLS, grants, query limits, or invocation-time authorization.

#### Scenario: Technician plans a query
- **WHEN** a Technician asks an operational question
- **THEN** the planner profile omits protected identity columns and cross-technician semantics while retaining the business definitions needed to query the Technician's authorized data

#### Scenario: Profile exceeds prompt budget
- **WHEN** the selected profile would exceed its configured prompt-size budget
- **THEN** the system deterministically selects only relevant approved profile sections or rejects planning rather than silently truncating structural constraints

### Requirement: Inspectable failure classification
The system SHALL distinguish profile drift, semantic validation failure, structural SQL validation failure, authorization denial, database execution failure, and successful empty results using sanitized codes. It MUST NOT log raw SQL, query literals, access tokens, database messages, or result rows by default.

#### Scenario: Query returns no rows
- **WHEN** a semantically and structurally valid authorized query executes successfully with no matching rows
- **THEN** the assistant states that no matching authorized records were found

#### Scenario: Semantic profile rejects a query
- **WHEN** a generated query uses an unknown enum value or invalid profiled relationship
- **THEN** audit metadata records only the sanitized failure category, profile version, and affected structural identifier

### Requirement: Profile refresh workflow
The system SHALL provide a documented, repeatable workflow to regenerate structural metadata, review business-semantic changes, validate drift, and update tests whenever migrations alter query-visible schema.

#### Scenario: Developer adds a query-visible column
- **WHEN** a migration adds or changes a column exposed to the query skill
- **THEN** the refresh workflow produces a reviewable profile diff and CI remains failing until required semantics and tests are updated

