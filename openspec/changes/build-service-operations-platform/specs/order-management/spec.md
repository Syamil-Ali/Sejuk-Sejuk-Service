## Purpose

Enable administrators to capture, assign, find, and verify customer service orders with consistent identifiers and complete operational details.

## ADDED Requirements

### Requirement: Admin can create a service order
The system SHALL allow an Admin to create an order containing customer name, phone, address, problem description, service type, quoted price, optional assigned technician, and optional admin notes.

#### Scenario: Admin creates an assigned order
- **WHEN** an Admin submits valid order details and selects an active Technician
- **THEN** the system creates the order with a unique generated order number, records the creator and timestamps, assigns the technician, and sets status to `Assigned`

#### Scenario: Admin creates an unassigned order
- **WHEN** an Admin submits valid order details without selecting a technician
- **THEN** the system creates the order with status `New`

#### Scenario: Required order data is invalid
- **WHEN** an Admin omits a required field or submits an invalid phone number or negative quoted price
- **THEN** the system identifies the invalid fields and does not create the order

### Requirement: Order numbers are generated safely
The system SHALL generate human-readable order numbers that are unique even when multiple orders are created concurrently.

#### Scenario: Concurrent order creation
- **WHEN** two valid orders are submitted at the same time
- **THEN** each order receives a different order number and both records are retained

### Requirement: Only Admin can assign or reassign technicians
The system SHALL allow an Admin to assign an active Technician to a `New` order or reassign an order that has not reached `Job Done`.

#### Scenario: Admin assigns a new order
- **WHEN** an Admin assigns an active Technician to an order with status `New`
- **THEN** the system stores the assignment and changes the status to `Assigned`

#### Scenario: Admin attempts late reassignment
- **WHEN** an Admin attempts to reassign an order at `Job Done`, `Reviewed`, or `Closed`
- **THEN** the system rejects the reassignment and preserves the existing technician

### Requirement: Authorized users can discover relevant orders
The system SHALL provide status filters, text search by order number or customer, and an order detail view scoped to each user's permissions.

#### Scenario: Admin searches by order number
- **WHEN** an Admin searches using a complete or partial order number
- **THEN** the system returns matching authorized orders with status, customer, technician, and scheduled information

#### Scenario: Order is created successfully
- **WHEN** an Admin completes order creation
- **THEN** the system displays a summary containing the generated order number and all submitted operational details

