## Context

See `proposal.md` for motivation. The Next.js frontend uses React client components, Tailwind utilities, a shared `DemoProvider`, Supabase integrations, and a universal `AppShell`. The shell is already shared, but it still owns navigation configuration, desktop sidebar markup, mobile navigation, authentication transitions, unread calculations, and viewport behavior in one component. Several portal routes are hundreds of lines long, with the order-detail route exceeding one thousand lines.

The refactor must work with the current styling approach and cannot rely on a wholesale visual rewrite. Authorization must remain enforced at its existing authoritative boundaries; reusable presentation components must not become a substitute for permission checks.

## Goals / Non-Goals

**Goals:**

- Define clear ownership between application layout, reusable UI primitives, domain feature components, hooks, and route composition.
- Make shared components configurable through typed props and composition rather than role checks scattered through presentation markup.
- Keep each migration step small enough to compare against the current route and revert independently.
- Preserve accessibility, responsive behavior, the desktop density treatment, and internal-scroll viewport layouts.
- Add focused tests where extraction could alter permissions, form state, calculations, filtering, or workflow actions.

**Non-Goals:**

- Redesigning screens or changing copy, routes, workflows, business rules, or backend contracts.
- Replacing Tailwind, React, Next.js, Supabase, or the existing icon library.
- Building an abstract design-system package for hypothetical external applications.
- Moving all state out of `DemoProvider` in the same change.
- Pursuing a target line count at the cost of clear local cohesion.

## Decisions

### 1. Organize reusable code by responsibility and domain

Use the following direction:

```text
src/components/
  ui/             low-level visual primitives
  layout/         portal shell and navigation
  data-display/   generic metrics, tables, filters, and states
src/features/
  orders/
  checklist/
  payments/
  reviews/
  communications/
  analytics/
src/hooks/        reusable stateful behavior
src/lib/          pure utilities, formatting, policies, and adapters
src/app/          thin route composition
```

Feature-specific components stay in `features`; only components with domain-independent meaning belong in `components`. This avoids both page silos and an unsearchable global component folder.

Alternative considered: place every extracted component in `components`. Rejected because domain ownership would remain unclear as the application grows.

### 2. Decompose the existing shell without duplicating it

`AppShell` remains the single portal layout entry point. Extract `PortalSidebar`, `SidebarSection`, `SidebarUser`, `MobileNavigation`, and `PortalContent`, with navigation described by typed role configuration. Authentication redirects and global unread aggregation remain coordinated by `AppShell` or a dedicated shell hook.

Alternative considered: separate admin, manager, and technician shells. Rejected because it recreates the duplication this change is intended to remove.

### 3. Prefer composition and typed configuration over universal components

Shared components expose stable extension points. For example, `OrderQueue` owns search, filtering, list/table structure, loading, and empty states while callers provide role-appropriate columns or row actions. It must not accumulate a large set of booleans such as `isManager`, `isTechnician`, and `showEverything`.

Use small render props, typed column definitions, slots, or child composition only where real variants already exist. Do not extract one-off markup merely to reduce file length.

Alternative considered: a single role-aware order component containing all branching. Rejected because it would move the silo rather than remove it.

### 4. Separate data derivation from presentation

Pure selectors and formatting helpers produce view models for components. Stateful behaviors such as queue filters, draft checklist editing, and chat scrolling may use focused hooks. Routes select authorized data and bind actions; components render the supplied model and emit typed events.

Permission checks remain in provider/backend policies and route-level action orchestration. Presentation hiding is only a usability layer, never the security boundary.

Alternative considered: introduce a new global state library. Rejected because current state management is adequate and a state migration would unnecessarily expand risk.

### 5. Build primitives from repeated, proven patterns

Initial primitives should cover patterns already repeated across the application: `SectionCard`, `MetricCard`, `ListToolbar`, `SearchField`, `StatusFilter`, `DataTable`, `EmptyState`, `ProgressBar`, `ConfirmDialog`, `FormField`, and loading/error states. Existing specialized components such as `StatusBadge`, `EvidenceUploader`, and `ServiceChecklist` should be retained and relocated or refined rather than rewritten without cause.

Variants use typed props and the existing token/utility conventions. No external UI dependency is introduced.

### 6. Migrate vertically by route family

Create primitives first, then migrate complete feature slices: shell, order queues, dashboards, order detail/checklist/payment sections, communications, and remaining smaller pages. A route is considered migrated only when its old duplicated implementation is removed and its regression checks pass.

This vertical approach keeps intermediate builds functional. A broad folder move followed by repairs is explicitly avoided.

### 7. Test behavior at stable public boundaries

Use component tests for reusable interactive units and route/feature tests for critical workflows. Tests should assert observable behavior rather than Tailwind class strings or internal component trees. At minimum, cover role-specific navigation, queue filtering/actions, checklist draft-versus-save behavior, payment calculations and recording, review corrections, and message/assistant scrolling.

## Risks / Trade-offs

- **Over-abstraction makes components harder to use** → Extract only patterns used in at least two places or with independently meaningful behavior; keep domain-specific components in their feature.
- **Refactoring changes visual details accidentally** → Migrate one route family at a time and compare responsive states before deleting the original markup.
- **Authorization logic moves into presentation components** → Keep security checks in current provider/backend boundaries and pass already-scoped data into reusable views.
- **Large prop APIs become another form of coupling** → Prefer composed children and typed configuration objects; split a component when variants stop sharing structure.
- **Mixed old and new structure temporarily increases complexity** → Define migration order and remove obsolete files immediately after each verified slice.
- **Tests become coupled to markup** → Assert labels, interactions, state transitions, and outputs rather than implementation-specific class names.

## Migration Plan

1. Record a baseline with lint, typecheck, tests, and production build; identify critical manual role flows.
2. Create target directories and foundational primitives without changing routes.
3. Decompose `AppShell` while preserving its single public entry point.
4. Introduce the shared order queue and migrate Orders, Reviews, and My Jobs one at a time.
5. Extract shared analytics components and migrate manager and technician dashboards.
6. Decompose order detail into order, checklist, review, payment, audit, and assignment feature sections.
7. Decompose Messages and reuse shared feedback/form primitives in Assistant and Notifications.
8. Migrate remaining payment and order-creation surfaces, remove obsolete implementations, and normalize imports.
9. Run the complete verification suite and manually validate admin, manager, and technician navigation and primary workflows.

Rollback is route-family based: each migration step should remain a discrete change so a failing slice can be reverted without undoing previously verified extractions.
