## Purpose

Provides flexible model-generated analytics across approved operational data while preserving read-only execution, authenticated role scope, bounded resource use, and inspectable evidence.

## ADDED Requirements

### Requirement: Model-generated analytical SQL
The system SHALL allow the assistant to generate a single PostgreSQL `SELECT` query for an authenticated user's analytical question, including approved joins, filters, aggregates, grouping, ordering, and common-table expressions.

#### Scenario: Manager asks a multi-table analytics question
- **WHEN** a Manager asks a question that requires combining orders, completions, payments, and technician profiles
- **THEN** the assistant may generate and execute one analytical `SELECT` query over the approved relations and summarize the authorized result

#### Scenario: Question needs no database evidence
- **WHEN** a user asks a greeting or general question that does not require operational facts
- **THEN** the assistant answers without generating or executing SQL

### Requirement: Structurally enforced read-only SQL
The system MUST parse and validate generated SQL before execution and SHALL accept only one read-only query statement. It SHALL reject mutations, data-definition commands, transaction or session commands, multiple statements, comments used to conceal additional statements, unsafe functions, system catalogs, and unapproved schemas or relations.

#### Scenario: Model generates a mutation
- **WHEN** generated SQL contains `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`, DDL, or another state-changing operation
- **THEN** the system rejects the query before database execution and returns no partial result

#### Scenario: Mutation is hidden in a CTE or second statement
- **WHEN** generated SQL embeds a write operation inside a common-table expression or appends another statement
- **THEN** structural validation rejects the complete query before execution

#### Scenario: Query accesses unsafe database facilities
- **WHEN** generated SQL references system catalogs, file/network functions, session controls, advisory locks, sleep functions, or a non-allowlisted relation
- **THEN** the system rejects the query with a sanitized non-retryable response

### Requirement: Caller-bound database authorization
Every accepted query SHALL execute as the authenticated Supabase caller, under existing RLS and role grants, without a service-role credential. Technician-visible results MUST remain limited to the caller's assigned work and related records even when the generated SQL requests another technician, omits an ownership predicate, uses joins, or computes aggregates.

#### Scenario: Technician asks about another technician
- **WHEN** a Technician asks for another Technician's jobs, earnings, payments, customers, counts, or comparisons
- **THEN** the database returns no protected rows or aggregates and the assistant gives a permission-safe response without confirming protected data exists

#### Scenario: Generated query omits technician ownership filter
- **WHEN** SQL generated for a Technician does not include an explicit authenticated-user predicate
- **THEN** caller-bound RLS still limits every participating relation to rows authorized for that Technician

#### Scenario: Manager runs organization analytics
- **WHEN** an authenticated Manager requests organization-wide analytics
- **THEN** the query may return the organization data granted to Managers while retaining document, conversation, and other restricted-domain policies

### Requirement: Bounded analytical execution
The system SHALL apply a read-only execution context, statement timeout, result-row cap, output-size cap, join and query-complexity limits, and maximum date range before results reach the model.

#### Scenario: Query exceeds its deadline
- **WHEN** an accepted query exceeds the configured statement timeout
- **THEN** execution is cancelled, no partial result reaches the model, and the user receives a safe retry or narrowing message

#### Scenario: Query returns too many rows
- **WHEN** a query would exceed the configured row or output limit
- **THEN** the system truncates only when semantically safe or rejects the result and asks for a narrower question

#### Scenario: Query is excessively complex
- **WHEN** the parsed query exceeds configured join, subquery, expression, or date-range limits
- **THEN** the system rejects it before execution

### Requirement: Grounded result summarization
The assistant SHALL summarize only the structured result produced by the authorized query, distinguish empty or truncated evidence, and avoid claiming facts not represented in the result.

#### Scenario: Query returns a count
- **WHEN** the authorized SQL result contains the number of the caller's jobs scheduled today
- **THEN** the assistant states that count and the applicable date in plain language

#### Scenario: Authorized query returns no rows
- **WHEN** execution succeeds but returns no authorized matching rows
- **THEN** the assistant states that no matching authorized records were found rather than treating the query as a system failure

### Requirement: Query traceability
The system SHALL audit the selected query skill, a normalized fingerprint or sanitized query representation, referenced allowlisted relations, authorization outcome, execution time, row count, truncation state, and correlation identifier without logging secrets or unrestricted result contents.

#### Scenario: Operator investigates an analytical answer
- **WHEN** an authorized operator inspects an assistant audit event by correlation identifier
- **THEN** the event identifies the validated query path, referenced relations, execution outcome, and evidence identifiers needed to reproduce the authorization decision

#### Scenario: Query validation is denied
- **WHEN** generated SQL fails structural or authorization validation
- **THEN** the denial reason and safe query fingerprint are audited without storing protected values or executing the query
