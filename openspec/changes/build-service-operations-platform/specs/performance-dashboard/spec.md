## Purpose

Give managers understandable weekly and date-filtered visibility into service throughput, revenue, scheduling friction, and technician performance.

## ADDED Requirements

### Requirement: Manager can view operational KPIs
The system SHALL provide total completed jobs, total final amount, total payments received, outstanding balance, and postponement/reschedule count for a selected date range, defaulting to the current week in the `Asia/Kuala_Lumpur` timezone.

#### Scenario: Manager opens dashboard
- **WHEN** a Manager opens the dashboard without selecting dates
- **THEN** the system displays KPI cards calculated for the current Malaysian calendar week

#### Scenario: Manager changes date range
- **WHEN** a Manager selects a valid start and end date
- **THEN** all dashboard cards, charts, and technician rankings refresh from the same inclusive range

### Requirement: Manager can compare technicians
The system SHALL show each Technician's jobs completed, final amount, and postponement/reschedule count and SHALL rank technicians by completed jobs with final amount as a tie-breaker.

#### Scenario: Two technicians have equal completed jobs
- **WHEN** two Technicians have the same completed-job count in the selected range
- **THEN** the Technician with the higher total final amount ranks first

### Requirement: Dashboard clearly handles incomplete data states
The system SHALL distinguish loading, empty, and error states and SHALL avoid presenting missing data as zero unless the query succeeded.

#### Scenario: No jobs match selected range
- **WHEN** a successful dashboard query returns no matching jobs
- **THEN** the system presents an empty-state explanation and zero-valued aggregates

#### Scenario: Dashboard query fails
- **WHEN** dashboard data cannot be retrieved
- **THEN** the system shows an error state with a retry action rather than potentially misleading metrics

