## Purpose

Ensures every organization role receives timely, actionable operational and communication alerts without exposing unauthorized records.

## ADDED Requirements

### Requirement: Every role can access notifications
The system SHALL provide administrators, technicians, and managers with a notification inbox containing only notifications addressed to that user or role.

#### Scenario: Technician views assigned alerts
- **WHEN** a technician opens Notifications
- **THEN** the technician sees their assignments, correction requests, schedule changes, mentions, and messages but not other technicians' private alerts

#### Scenario: Admin views operational alerts
- **WHEN** an administrator opens Notifications
- **THEN** the administrator sees relevant assignment, scheduling, payment, mention, and message alerts

### Requirement: Notifications are actionable
Each notification SHALL include a category, priority, creation time, read state, descriptive content, and a valid destination when the event has a related order or conversation.

#### Scenario: Open correction notification
- **WHEN** a technician selects a correction notification
- **THEN** it is marked read and the related order opens

### Requirement: Unread state is consistent
The system SHALL display a role-scoped unread count and SHALL allow a user to mark one notification or all visible notifications as read.

#### Scenario: Read count updates
- **WHEN** a user marks a notification as read
- **THEN** the inbox and navigation badge immediately show the reduced unread count

### Requirement: Operational events generate recipient-specific alerts
The system SHALL generate notifications for assignments, schedule changes, postponements, correction requests, completed work, payment activity, announcements, direct messages, and mentions while avoiding duplicate delivery of the same event to the same recipient.

#### Scenario: Manager requests correction
- **WHEN** a manager returns an order and reopens checklist items
- **THEN** the assigned technician receives one high-priority notification summarizing the reason and linking to the order

