## Purpose

Provide one permission-scoped operational source of truth that remains consistent across authenticated users, browser tabs, browsers, and devices.

## ADDED Requirements

### Requirement: Production operations use shared persistence
When demo mode is disabled, the portal SHALL load and mutate service orders and their workflow records through the authenticated shared data service rather than browser-local storage.

#### Scenario: Manager opens the review queue
- **WHEN** an authenticated manager opens the review page in production mode
- **THEN** the page displays all completed orders visible under the manager's database permissions

#### Scenario: User refreshes the browser
- **WHEN** an authorized user refreshes after a successful workflow mutation
- **THEN** the updated order state remains available from shared persistence

#### Scenario: Explicit demo mode is enabled
- **WHEN** the application runs with demo mode enabled
- **THEN** seeded browser-local behavior remains available without requiring Supabase

### Requirement: Completed work becomes visible across sessions
The portal SHALL propagate committed operational changes to other authorized active sessions without requiring a manual page reload.

#### Scenario: Technician completes a job
- **WHEN** an assigned technician successfully marks an order as Job Done
- **THEN** an active authorized manager session shows that order as Needs review after receiving the shared change

#### Scenario: Manager returns work for correction
- **WHEN** a manager successfully returns an order and reopens selected checklist items
- **THEN** the assigned technician's active session shows the correction state and reopened items

#### Scenario: Realtime delivery is interrupted
- **WHEN** a realtime event is missed or the connection reconnects
- **THEN** the portal refreshes authorized operational state so persisted data remains authoritative

### Requirement: Workflow mutations preserve authorization and concurrency
All production workflow mutations SHALL execute using the authenticated caller and SHALL preserve database role rules and order-version conflict checks.

#### Scenario: Assigned technician completes valid work
- **WHEN** the assigned technician submits a valid completion against the current order version
- **THEN** the completion, order status, payment if supplied, audit record, and manager notification are committed atomically

#### Scenario: Stale session submits a mutation
- **WHEN** a session submits an outdated order version
- **THEN** the mutation fails visibly and the portal reloads the current persisted order instead of overwriting it

#### Scenario: Unauthorized user attempts a mutation
- **WHEN** a caller lacks permission for an order or lifecycle action
- **THEN** the database rejects the mutation and no local state falsely presents it as successful

### Requirement: Related operational records hydrate consistently
The portal SHALL assemble each visible service order with the checklist, completion, payments, reviews, schedule events, evidence, and audit data needed by existing screens.

#### Scenario: Review details are loaded
- **WHEN** a manager opens a completed order
- **THEN** completion notes, evidence, checklist state, payment history, review history, and audit history reflect shared persisted records

#### Scenario: Payment is recorded
- **WHEN** an authorized user records an additional customer payment
- **THEN** all authorized sessions derive received and outstanding amounts from the updated persisted payment records

### Requirement: Shared notifications are permission scoped
Production notifications SHALL be read from and updated in shared persistence under the authenticated caller's database permissions.

#### Scenario: Completion creates manager notification
- **WHEN** a technician completion succeeds
- **THEN** authorized managers can receive and mark the resulting shared notification as read

#### Scenario: Technician reads notifications
- **WHEN** a technician opens notifications
- **THEN** the technician receives only notifications allowed by the current user's database scope

### Requirement: Loading and failure states are truthful
The portal SHALL distinguish initial loading, successful shared state, and mutation or synchronization failure without silently falling back to unrelated browser-local data.

#### Scenario: Initial shared load is pending
- **WHEN** production operational data has not finished loading
- **THEN** the portal shows a loading state instead of seeded demo records

#### Scenario: Shared load fails
- **WHEN** production operational data cannot be loaded
- **THEN** the portal reports the failure and offers retry behavior without overwriting shared data

### Requirement: Local-first deployment remains portable
The application SHALL implement and verify shared operations against local Supabase first while remaining configurable for a hosted Supabase project using the same schema and application behavior.

#### Scenario: Developer runs the local stack
- **WHEN** the documented local Supabase and frontend commands are executed
- **THEN** authenticated multi-session operational workflows use the local database and realtime service

#### Scenario: Application is promoted online
- **WHEN** the same migrations are applied to hosted Supabase and the public project URL and anonymous key are changed
- **THEN** the application uses the hosted project without requiring workflow-code changes or a browser service-role key

### Requirement: Completion offers a truthful WhatsApp handoff
After a successful Job Done commit, the portal SHALL offer the technician a pre-filled WhatsApp feedback message addressed to the customer and SHALL distinguish opening the handoff from confirmed delivery.

#### Scenario: Completion succeeds
- **WHEN** the assigned technician successfully commits a completed job
- **THEN** the interface immediately presents an action to open the customer's pre-filled WhatsApp feedback message

#### Scenario: Technician opens WhatsApp
- **WHEN** the technician activates the completion feedback action
- **THEN** the system opens the generated `wa.me` destination and records an auditable handoff-open event

#### Scenario: Handoff is not opened or delivery is unknown
- **WHEN** the technician dismisses the action or WhatsApp provides no delivery confirmation
- **THEN** the system does not claim that the customer was notified or that the message was delivered

### Requirement: Submission documentation reflects implemented behavior
The repository documentation SHALL accurately describe the current architecture, local startup flow, AI provider and query behavior, supported assessment modules, security boundary, and known limitations.

#### Scenario: Reviewer follows local setup
- **WHEN** an assessment reviewer follows the README from a clean local checkout with required tooling
- **THEN** the documented commands identify how to start Supabase, apply migrations and seed data, configure environment variables, and run the application services

#### Scenario: Reviewer evaluates AI limitations
- **WHEN** a reviewer reads the AI section
- **THEN** it describes Gemini/Agno, controlled read-only SQL, permission scoping, supported operational subjects, and genuine remaining limitations without stale OpenAI or four-intent claims
