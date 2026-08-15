## Purpose

Give managers a reliable review and closure process while retaining a traceable history of operational and financial changes.

## ADDED Requirements

### Requirement: Manager can review completed jobs
The system SHALL allow a Manager to inspect order details, completion work, evidence, quoted and final amounts, payment information, and exception indicators before accepting or returning a `Job Done` order.

#### Scenario: Manager accepts a completed job
- **WHEN** a Manager accepts a `Job Done` order with optional review notes
- **THEN** the system records the review, reviewer, and timestamp and changes status to `Reviewed`

#### Scenario: Manager returns a completed job for correction
- **WHEN** a Manager provides a reason for returning a `Job Done` order
- **THEN** the system records the review outcome, optionally reopens specified checklist items, returns the order to `In Progress`, and notifies the assigned Technician internally

#### Scenario: Manager reviews checklist proof
- **WHEN** a Manager opens a completed job
- **THEN** the system shows every checklist item with completion actor/time, note, and linked image proof

### Requirement: Review surfaces deterministic exceptions
The system SHALL flag a completed job for manager attention when the final amount exceeds the quoted price or no image evidence is attached, without blocking review.

#### Scenario: Completed amount is above quote
- **WHEN** a Manager opens a job whose final amount is greater than its quoted price
- **THEN** the review view clearly identifies the price variance and its amount

#### Scenario: Completed job has no image evidence
- **WHEN** a Manager opens a completed job with no image evidence
- **THEN** the review view clearly identifies the missing-evidence condition

### Requirement: Manager can close a reviewed order
The system SHALL allow a Manager to change a `Reviewed` order to `Closed` and SHALL prevent further operational edits after closure.

#### Scenario: Manager closes reviewed order
- **WHEN** a Manager closes an order with status `Reviewed`
- **THEN** the system records the closure and prevents assignment, service, payment, and review changes to that order

### Requirement: Key actions are auditable
The system MUST append an immutable audit event for order creation, assignment or reassignment, status transition, postponement, completion, payment recording, review outcome, and closure.

#### Scenario: Authorized user changes operational state
- **WHEN** a tracked action succeeds
- **THEN** the audit history records the order, actor, action, timestamp, and relevant before/after values

#### Scenario: User views order history
- **WHEN** an authorized Admin or Manager opens the history for an order
- **THEN** the system displays audit events in chronological order without offering edit or delete actions
