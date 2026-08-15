## 1. Admin Assignment Confirmation

- [x] 1.1 Inspect the existing assignment control and add pending-selection state that does not mutate the order immediately
- [x] 1.2 Add an accessible confirmation popup naming the technician, with cancel and confirm behavior
- [x] 1.3 Add coverage proving cancel preserves and confirm updates the assignment

## 2. Checklist Interaction Reliability

- [x] 2.1 Reproduce and fix the checklist Add image UI error, including safe input reset and image validation feedback
- [x] 2.2 Redesign checklist rows and tick controls to clearly communicate completed, incomplete, required, and optional states
- [x] 2.3 Catch checklist toggle, evidence, and completion mutation failures at their UI handlers and display actionable feedback
- [x] 2.4 Verify premature completion remains blocked without producing a runtime error overlay

## 3. Postponement Escalation

- [x] 3.1 Update the reschedule mutation to notify every manager with order, technician, reason, old schedule, and new schedule context
- [x] 3.2 Verify manager notifications appear after a valid technician postponement and remain absent after rejected attempts

## 4. Quality Verification

- [x] 4.1 Add or update unit tests for provider transition guards and manager notification fan-out
- [x] 4.2 Add browser coverage for assignment confirmation, image attachment, checklist clarity, graceful incomplete completion, and postponement notification
- [x] 4.3 Run typecheck, lint, focused tests, and the relevant desktop/mobile browser workflows
