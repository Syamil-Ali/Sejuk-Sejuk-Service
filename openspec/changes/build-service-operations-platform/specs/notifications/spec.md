## Purpose

Prepare actionable WhatsApp communications and in-portal alerts at important service events while keeping notification attempts traceable.

## ADDED Requirements

### Requirement: Admin can notify assigned technician through WhatsApp
The system SHALL generate an encoded WhatsApp deep link for an assigned technician containing the order number, service type, customer location, and scheduled information.

#### Scenario: Admin opens assignment message
- **WHEN** an Admin chooses to notify the Technician after assignment
- **THEN** the system opens WhatsApp with the technician phone number and a pre-filled message without exposing unrelated customer data

### Requirement: Completion produces manager notification
The system SHALL create an unread in-portal notification for Managers when an order becomes `Job Done`.

#### Scenario: Technician completes a job
- **WHEN** an order successfully transitions to `Job Done`
- **THEN** Managers can see a notification linking to that job's review view

### Requirement: Customer feedback message is available after completion
The system SHALL generate an encoded WhatsApp deep link using the customer's phone number and a pre-filled message containing customer name, order number, technician name, completion time, and a feedback request.

#### Scenario: Technician opens customer feedback message
- **WHEN** the assigned Technician chooses the feedback action on a `Job Done` order
- **THEN** the system opens WhatsApp with the correct recipient and pre-filled completion message

### Requirement: Notification actions are traceable
The system SHALL record creation and user activation of each notification or WhatsApp deep link but SHALL NOT claim that a deep-link message was delivered.

#### Scenario: User activates a WhatsApp link
- **WHEN** an authorized user opens a generated WhatsApp link
- **THEN** the system records the activation time and continues to describe delivery status as unknown

