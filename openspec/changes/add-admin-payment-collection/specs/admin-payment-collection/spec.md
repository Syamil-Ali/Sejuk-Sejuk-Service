## Purpose

Provides administrators with a controlled, auditable workflow for finding and collecting customer balances that remain after field service.

## ADDED Requirements

### Requirement: Administrator can view payment accounts
The system SHALL provide administrators with a payment queue showing each eligible order's customer, service status, payment status, final amount, total received, and outstanding balance.

#### Scenario: View outstanding balances
- **WHEN** an administrator opens the payment queue
- **THEN** unpaid and partially paid orders are shown with their current outstanding balances

#### Scenario: Search and filter accounts
- **WHEN** an administrator searches by order or customer and selects a payment-status filter
- **THEN** the queue shows only accounts matching both criteria

### Requirement: Administrator can record a subsequent payment
The system SHALL allow an administrator to add a positive customer payment to an order with an outstanding balance, including a payment method and optional notes describing the payment arrangement.

#### Scenario: Record partial collection
- **WHEN** an administrator records an amount below the outstanding balance
- **THEN** the payment is stored and the order remains Partially paid with a reduced outstanding balance

#### Scenario: Settle an account
- **WHEN** an administrator records an amount equal to the outstanding balance
- **THEN** the payment is stored and the order becomes Paid with zero outstanding balance

#### Scenario: Record a payment arrangement note
- **WHEN** an administrator records a payment with notes describing when or how the remaining balance will be paid
- **THEN** the note is stored on that payment and displayed with the payment-history entry

#### Scenario: Reject invalid collection
- **WHEN** an administrator submits a zero, negative, methodless, or excessive payment
- **THEN** the system rejects it without changing the account

### Requirement: Payment and service statuses remain independent
The system MUST calculate payment status independently from the operational service status.

#### Scenario: Close with balance remaining
- **WHEN** a reviewed order is closed while an outstanding balance exists
- **THEN** its service status becomes Closed and its payment status remains Unpaid or Partially paid

### Requirement: Payment history is auditable
The system SHALL retain every payment's amount, method, timestamp, recording actor, and optional notes and SHALL add a corresponding order audit event containing any supplied note.

#### Scenario: Inspect account history
- **WHEN** an administrator views a payment account after multiple collections
- **THEN** all collections are displayed chronologically with their recorded metadata and optional notes
