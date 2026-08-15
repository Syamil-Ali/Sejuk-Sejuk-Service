## Why

Core admin-to-technician handoffs currently lack confirmation and escalation feedback, while checklist validation and evidence attachment failures can surface as disruptive runtime errors. These problems make it too easy to assign work accidentally and too hard for technicians and managers to understand what action is required.

## What Changes

- Ask an admin to confirm the selected technician before an assignment is committed.
- Make checklist evidence image selection stable and show recoverable validation feedback instead of breaking the UI.
- Redesign checklist completion controls so checked, unchecked, required, and blocked states are visually clear.
- Keep the order completion guard, but surface incomplete-checklist errors inline/toast without a Next.js runtime error overlay.
- Notify managers when a technician postpones/reschedules a job, including the reason and new scheduled time so follow-up action can be taken.

## Capabilities

### New Capabilities

- `technician-workflow-reliability`: Covers confirmed technician assignment, reliable checklist evidence and completion controls, graceful completion validation, and manager notification when work is postponed.

### Modified Capabilities

None.

## Impact

- Admin assignment controls and order detail interactions.
- Technician checklist, evidence upload, completion, and postponement UI.
- Demo state mutations and notification recipients in `src/components/demo-provider.tsx`.
- Browser and unit coverage for assignment, checklist validation, image attachment, and manager notifications.
