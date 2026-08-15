## Purpose

Attach service evidence and optional payment records to completed field work while protecting customer files from unauthorized access.

## ADDED Requirements

### Requirement: Technician can attach job evidence
The assigned Technician SHALL be able to upload up to six evidence files per job, limited to supported image, video, and PDF formats with a maximum size of 10 MB per file.

#### Scenario: Technician uploads valid evidence
- **WHEN** the assigned Technician selects six or fewer supported files within the size limit
- **THEN** the system stores the files against the job and displays upload progress and resulting file entries

#### Scenario: Technician selects invalid evidence
- **WHEN** a selected file has an unsupported type, exceeds 10 MB, or would increase the job total above six files
- **THEN** the system identifies the rejected file and does not store it

### Requirement: Job evidence is private
The system MUST restrict evidence access to authorized Admins, the assigned Technician, and Managers and SHALL use time-limited access links when rendering private files.

#### Scenario: Unauthorized user requests an evidence URL
- **WHEN** a user without access to the job requests one of its evidence files
- **THEN** the system refuses access and does not expose a reusable public URL

### Requirement: Image proof can be linked to checklist items
The assigned Technician SHALL be able to attach supported private images to an individual checklist item, and authorized reviewers SHALL see that proof beside the completed step.

#### Scenario: Technician attaches proof to a checklist step
- **WHEN** the assigned Technician adds a valid image while updating an active checklist item
- **THEN** the system stores it privately, links it to that item, and shows its upload state

### Requirement: Technician can record payment received
The assigned Technician SHALL be able to record an optional payment amount, payment method, timestamp, and optional receipt image while completing a job; the amount MUST be non-negative and MUST NOT exceed the final amount.

#### Scenario: Technician records a valid partial or full payment
- **WHEN** the assigned Technician submits a valid amount and payment method
- **THEN** the system stores the payment against the job and shows the remaining balance

#### Scenario: Technician submits an excessive payment
- **WHEN** the submitted payment amount exceeds the calculated final amount
- **THEN** the system rejects the payment and preserves the existing balance
