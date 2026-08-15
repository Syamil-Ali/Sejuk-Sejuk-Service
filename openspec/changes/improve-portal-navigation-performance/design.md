## Context

See `proposal.md` for motivation. The portal already keeps a shared client-side shell mounted and uses Next.js links, but all destination pages are client components and the two dashboards import Recharts directly. Development mode compiles unseen routes on demand, and the absence of pending feedback makes that work appear to be an ignored click. The sidebar's visual theme and role-specific navigation must remain unchanged.

## Goals / Non-Goals

**Goals:**

- Give immediate, accessible feedback after a navigation click.
- Warm role-accessible routes after the shell is interactive.
- Isolate chart-library code behind dashboard-local dynamic boundaries with stable placeholders.
- Preserve the shared shell and existing page layouts.

**Non-Goals:**

- Rewriting portal pages as server components in this change.
- Changing authorization, routes, sidebar styling, or business data flow.
- Eliminating Next.js development compilation time entirely.

## Decisions

### Use one shared navigation progress signal

The shared shell will own a lightweight route progress indicator driven by link activation and cleared when the pathname changes. This provides feedback across desktop and mobile without duplicating state in every page. A global `loading.tsx` fallback will cover framework-controlled route loading and direct navigations. A third-party progress package was rejected because the behavior is small and does not justify another dependency.

### Prefetch role-accessible routes from shared navigation

The shell will call the router prefetch API for the current role's unique destinations after initial interaction work, while links retain framework prefetch behavior. This centralizes warming and does not expose unauthorized routes because destinations come from the existing role-specific navigation model. Prefetching every application route was rejected because it wastes bandwidth and compilation work.

### Put chart rendering behind dashboard-local dynamic boundaries

Reusable chart panels will contain Recharts imports and be dynamically loaded with server rendering disabled because Recharts is browser-oriented. Each boundary will provide a fixed-height tonal placeholder matching the final chart footprint. Removing charts or changing chart libraries was rejected because it would alter existing functionality and visual output.

## Risks / Trade-offs

- [Background prefetch can increase initial development compilation] -> Schedule it after the shell is ready and limit it to the current role's navigation.
- [A very fast route may briefly flash progress] -> Use a thin unobtrusive indicator and clear it synchronously when pathname changes.
- [Dynamic chart loading can delay charts slightly] -> Keep the surrounding dashboard available immediately and reserve chart height to prevent layout shift.
- [Development mode remains slower than production] -> Treat feedback and prefetch as mitigation; validate production build separately.

## Migration Plan

Introduce the shared pending indicator and route fallback first, then extract chart panels without changing their inputs. Validate navigation, role menus, chart rendering, reduced-motion behavior, and the production build. Rollback consists of restoring direct chart imports and removing the progress/prefetch additions; no persisted data changes are involved.
