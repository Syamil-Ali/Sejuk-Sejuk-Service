## Context

The application keeps demo operational state in a React provider and exposes mutations that throw domain errors. Some event handlers call those mutations without a local error boundary, allowing expected validation errors to reach the development runtime overlay. Checklist evidence uses browser file inputs and object/data representations that must remain safe across rerenders. See `proposal.md` and the capability spec for the expected behavior.

## Goals / Non-Goals

**Goals:**

- Keep domain guards authoritative while translating expected failures into inline or toast feedback at the interaction boundary.
- Add explicit confirmation before assignment without changing existing role permissions.
- Make checklist controls and evidence attachment stable and accessible.
- Fan postponement notifications out to every manager in the current user directory.

**Non-Goals:**

- Replacing demo state with a production backend or notification transport.
- Adding manager approval as a prerequisite for postponement.
- Changing checklist templates or completion business rules.

## Decisions

1. Assignment confirmation will use an application-styled modal with explicit Cancel and Confirm actions. This provides technician/order context and consistent UI; a native browser confirm was rejected because it cannot match the application or expose richer details cleanly.
2. Expected mutation failures will be caught by UI event handlers and rendered as toast/inline messages. Provider mutations will continue throwing so callers cannot accidentally treat rejected transitions as successful.
3. Evidence selection will validate image MIME type, count, and size before state mutation; the file input will be reset after handling so selecting the same file again works. Preview URLs will use the existing evidence representation and be cleaned up where necessary.
4. Checklist rows will use a real accessible checkbox/button target with a larger hit area, distinct completed styling, and visible Required/Optional labels.
5. Rescheduling will create one notification per manager, with structured human-readable schedule and reason context. The audit and schedule event remain the source of truth for the order history.

## Risks / Trade-offs

- [Manager notification fan-out can create several messages] → Limit recipients to users whose current role is manager and create one notification per reschedule event.
- [Large image data can inflate demo browser storage] → Enforce existing count limits plus an explicit per-file size limit and avoid persisting invalid data.
- [Confirmation adds a click to assignment] → Keep the modal focused and preserve the selected technician while it is open.
- [Catching errors may hide programming defects] → Catch only at known mutation interactions, show the actual Error message, and leave unexpected rendering errors untouched.

## Migration Plan

No persisted schema migration is required. Ship the UI and provider changes together, verify existing demo data loads, and roll back the component/provider changes as a unit if regression occurs.
