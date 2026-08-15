## Purpose

Provide assessment-friendly access to the portal while preserving testable role and record-level authorization boundaries for operational data.

## ADDED Requirements

### Requirement: Demo users can start authenticated role sessions
The system SHALL provide seeded Admin, Technician, and Manager identities and SHALL let a reviewer start a session by selecting a demo identity without registering a new account.

#### Scenario: Reviewer selects a demo identity
- **WHEN** a reviewer selects an available demo identity on the sign-in screen
- **THEN** the system starts a session for that exact user and displays the workspace for the user's assigned role

#### Scenario: User signs out
- **WHEN** an authenticated user signs out
- **THEN** the system ends the session and returns the user to the sign-in screen

### Requirement: Navigation is role aware
The system SHALL show only routes and primary actions relevant to the authenticated user's role.

#### Scenario: Technician opens the portal
- **WHEN** a Technician starts a session
- **THEN** the system presents the assigned-jobs workspace and does not present order assignment, manager review, KPI, or AI-assistant actions

#### Scenario: Manager opens the portal
- **WHEN** a Manager starts a session
- **THEN** the system presents review, dashboard, and operations-assistant navigation

### Requirement: Permissions are enforced beyond the user interface
The system MUST reject unauthorized reads and mutations at the server or data-policy boundary even when a hidden action or endpoint is called directly.

#### Scenario: Technician attempts to assign an order
- **WHEN** a Technician directly submits an order-assignment request
- **THEN** the system rejects the request and leaves the order unchanged

#### Scenario: Technician requests another technician's job
- **WHEN** a Technician requests a job assigned to a different technician
- **THEN** the system does not return the protected job data

