## Why

Portal navigation currently feels unresponsive while Next.js loads or compiles the destination route, especially for client-heavy dashboard pages. Users need immediate visual acknowledgement and faster repeat navigation so the interface feels stable rather than frozen.

## What Changes

- Show an immediate pending state when a portal navigation link is activated.
- Proactively prefetch accessible portal destinations from the shared navigation.
- Add a lightweight route loading surface for transitions that still require loading.
- Defer dashboard-only chart rendering code so it does not burden unrelated portal routes.
- Preserve the existing sidebar appearance, permissions, route behavior, and mobile navigation.

## Capabilities

### New Capabilities

- `portal-navigation-performance`: Defines responsive, prefetched portal navigation with accessible pending feedback and deferred heavy visualizations.

### Modified Capabilities

None.

## Impact

- Affects the shared portal sidebar/mobile navigation, portal route loading UI, and dashboard chart composition in `frontend`.
- Does not change APIs, database behavior, authorization, or navigation destinations.
- Uses existing Next.js and React capabilities without adding runtime dependencies.
