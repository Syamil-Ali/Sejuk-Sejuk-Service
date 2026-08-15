## Why

The frontend has reached a stable visual and functional baseline, but several route files now combine layout, domain logic, interaction state, and presentation in large page-level silos. Refactoring now will reduce duplication, make role-specific screens consistent, and allow future features to be added without copying existing UI and behavior.

## What Changes

- Preserve the existing user-visible design, routes, permissions, and workflows while reorganizing frontend implementation code.
- Split the shared portal shell into focused reusable layout components, retaining one universal role-configured sidebar and mobile navigation.
- Establish reusable UI and data-display primitives for recurring cards, metrics, filters, tables, empty states, dialogs, form controls, and feedback states.
- Extract feature-oriented components for orders, checklists, payments, reviews, communications, and analytics.
- Replace separate order-list implementations with a configurable shared queue/list foundation supporting role-specific columns, filters, and actions.
- Share dashboard presentation components between manager and technician dashboards while keeping their data and authorization rules distinct.
- Reduce route components to data selection, permission-aware orchestration, and composition of feature components.
- Add regression coverage for shared components and critical role workflows before removing duplicated implementations.
- Avoid adding a new component library or changing backend/API contracts as part of this refactor.

## Capabilities

### New Capabilities

None. This is an implementation-only refactor and introduces no new product capability.

### Modified Capabilities

None. Existing observable behavior remains the contract; this change opts out of specification deltas.

## Impact

- Primary scope: `frontend/src/components`, `frontend/src/app/portal`, and new feature-oriented frontend modules.
- Existing shared state in `DemoProvider`, Supabase access, assistant APIs, route URLs, and backend services remain compatible.
- Tests will be reorganized or added around extracted boundaries, with role-based authorization and workflow behavior treated as regression-sensitive.
- Migration will be incremental so each route can remain runnable and verifiable throughout the change.
