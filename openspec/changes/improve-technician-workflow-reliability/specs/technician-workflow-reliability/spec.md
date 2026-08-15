## Purpose

Make admin-to-technician handoffs and technician checklist work reliable, understandable, and visible to the managers responsible for operational follow-up.

## ADDED Requirements

### Requirement: Technician assignment requires confirmation
The system SHALL ask an admin to confirm the selected technician before committing an order assignment and SHALL identify the technician in that confirmation.

#### Scenario: Admin confirms assignment
- **WHEN** an admin selects a technician and confirms the assignment prompt
- **THEN** the system assigns the order to that technician and shows success feedback

#### Scenario: Admin cancels assignment
- **WHEN** an admin cancels the assignment prompt
- **THEN** the system leaves the existing assignment unchanged

### Requirement: Checklist evidence attachment is recoverable
The system SHALL allow an assigned technician to attach supported image evidence to a checklist item without breaking the checklist interface, and SHALL display actionable validation feedback for rejected files.

#### Scenario: Technician adds a supported image
- **WHEN** the assigned technician selects a supported image within configured limits
- **THEN** the system attaches it to the intended checklist item and keeps the checklist usable

#### Scenario: Technician selects invalid evidence
- **WHEN** the assigned technician selects an unsupported or excessive image
- **THEN** the system rejects it with user-facing feedback and does not show a runtime error overlay

### Requirement: Checklist completion state is clear
The system SHALL present each checklist item's required status and completion state with a clearly identifiable, accessible control.

#### Scenario: Technician toggles a checklist item
- **WHEN** the assigned technician checks or unchecks an eligible checklist item
- **THEN** its visual state, label, and completion metadata update consistently

### Requirement: Incomplete work cannot be completed gracefully
The system MUST prevent order completion while required checklist items remain incomplete and SHALL present the remaining count as normal user-facing feedback.

#### Scenario: Technician attempts premature completion
- **WHEN** a technician submits completion with one or more required checklist items incomplete
- **THEN** the order remains in progress and the interface identifies how many required items remain without displaying a runtime error overlay

### Requirement: Managers are notified of postponement
The system SHALL notify all manager users when an assigned technician postpones an active job, including the order, technician, reason, previous schedule, and new schedule.

#### Scenario: Technician postpones a job
- **WHEN** the assigned technician provides a reason and moves an active job to a valid future time
- **THEN** each manager receives a notification containing enough context to assess whether further action is required

