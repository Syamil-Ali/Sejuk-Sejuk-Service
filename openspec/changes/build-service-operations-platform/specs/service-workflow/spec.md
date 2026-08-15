## Purpose

Guide each service order through a controlled lifecycle and give field technicians a fast mobile workflow for recording work and completion.

## ADDED Requirements

### Requirement: Orders follow the defined lifecycle
The system MUST restrict primary status transitions to `New -> Assigned -> In Progress -> Job Done -> Reviewed -> Closed` and MUST reject attempts to skip or reverse these stages.

#### Scenario: Assigned technician starts work
- **WHEN** the assigned Technician starts an order with status `Assigned`
- **THEN** the system changes the status to `In Progress` and records the actor and time

#### Scenario: User attempts an invalid transition
- **WHEN** any user requests a transition that is not the next permitted lifecycle stage
- **THEN** the system rejects the transition and leaves the current status unchanged

#### Scenario: Concurrent transition conflict
- **WHEN** two users attempt conflicting transitions based on the same prior order version
- **THEN** the system accepts at most one transition and tells the other user to refresh the changed order

### Requirement: Technician sees a mobile-first assigned job list
The system SHALL show a Technician only their assigned active jobs with order number, customer, address, service type, scheduled time, and current status, prioritizing touch-friendly mobile interaction.

#### Scenario: Technician opens assigned jobs on a phone
- **WHEN** a Technician opens the job workspace on a mobile-width screen
- **THEN** active assigned jobs are readable and primary start/complete actions are usable without horizontal scrolling

### Requirement: Assigned technician can complete a job
The system SHALL allow only the assigned Technician to mark an `In Progress` order as `Job Done` after completing every required checklist item and providing work done, a non-negative extra charge, optional remarks, and any selected evidence; final amount SHALL equal quoted price plus extra charge.

#### Scenario: Valid job completion
- **WHEN** the assigned Technician submits valid completion details for an `In Progress` order
- **THEN** the system stores the service record, calculates the final amount, changes status to `Job Done`, and records the completion timestamp

#### Scenario: Different technician attempts completion
- **WHEN** a Technician who is not assigned to the order submits completion details
- **THEN** the system rejects the submission and leaves the order unchanged

#### Scenario: Completion data is invalid
- **WHEN** the assigned Technician submits an empty work-done description or a negative extra charge
- **THEN** the system reports validation errors and does not mark the job done

#### Scenario: Required checklist remains incomplete
- **WHEN** the assigned Technician attempts completion while any required checklist item is unchecked
- **THEN** the system identifies the remaining work and leaves the order `In Progress`

### Requirement: Orders carry an actionable service checklist
The system SHALL create an ordered checklist from the selected service type, SHALL allow an Admin to tailor it before work starts, and SHALL show progress to authorized users.

#### Scenario: Admin prepares an order checklist
- **WHEN** an Admin creates or edits an order before work starts
- **THEN** the system provides service-appropriate default items and allows the Admin to add, remove, rename, and reorder them

#### Scenario: Technician records checklist work
- **WHEN** the assigned Technician checks an item during an `In Progress` job
- **THEN** the system stores its completed state, Technician, completion time, optional note, and linked image proof

#### Scenario: Unauthorized user changes checklist work
- **WHEN** an unassigned Technician or a user outside the permitted lifecycle attempts to update an item
- **THEN** the system rejects the change and preserves checklist history

### Requirement: Technician can record postponement or rescheduling
The assigned Technician SHALL be able to record a postponement reason and proposed future service time without bypassing the lifecycle, and the system SHALL retain the event for KPI reporting.

#### Scenario: Technician postpones an active job
- **WHEN** the assigned Technician enters a reason and a future service time for an `Assigned` or `In Progress` job
- **THEN** the system updates the scheduled time, retains the current primary status, and records a postponement event
