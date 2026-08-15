## Purpose

Creates a persistent, permission-aware communication record for service orders and internal organization coordination.

## ADDED Requirements

### Requirement: Authorized users can participate in order conversations
The system SHALL provide one conversation per order to administrators, managers, and the assigned technician, subject to existing order visibility rules.

#### Scenario: Discuss a correction
- **WHEN** a manager posts correction guidance in an order conversation
- **THEN** authorized participants can read it chronologically and the assigned technician receives a notification

#### Scenario: Unauthorized technician opens an order conversation
- **WHEN** a technician who is not assigned to the order requests its conversation
- **THEN** the system denies access to the conversation and its messages

### Requirement: Organization members can exchange direct messages
The system SHALL allow an organization member to start or continue a direct conversation with another active member.

#### Scenario: Send direct message
- **WHEN** an administrator sends a direct message to a technician
- **THEN** both participants see the same persisted conversation and the recipient receives an unread notification

### Requirement: Authorized roles can publish announcements
The system SHALL allow managers and administrators to publish announcements to all members or one selected role.

#### Scenario: Role-targeted announcement
- **WHEN** a manager publishes an announcement to technicians
- **THEN** every technician can read it and receives one notification while administrators and managers are not notified as recipients

### Requirement: Messages support operational context
Messages SHALL preserve sender identity, creation time, body, optional attachments, optional mentions, conversation identity, and edit/deletion state.

#### Scenario: Send an attachment and mention
- **WHEN** an authorized participant posts a valid attachment and mentions another authorized participant
- **THEN** the message displays both and the mentioned participant receives a notification

### Requirement: Conversation unread state is per member
The system SHALL track the last-read position independently for each conversation member.

#### Scenario: Read one conversation
- **WHEN** a user opens a conversation containing unread messages
- **THEN** only that user's unread state for that conversation is cleared

### Requirement: Communication persists across sessions
Messages, memberships, announcements, attachments, and read state MUST be stored in shared persistent storage in multi-user mode and delivered to authorized active clients without requiring a page refresh.

#### Scenario: Receive realtime message
- **WHEN** one user sends a message while another authorized participant is online
- **THEN** the recipient sees the message and unread state update without refreshing

