## 1. Shared Navigation Feedback

- [x] 1.1 Add a reusable accessible portal navigation progress indicator that clears when the pathname changes and respects reduced motion
- [x] 1.2 Connect desktop and mobile portal links to the shared pending state without changing their current styling or destinations
- [x] 1.3 Add a stable portal route loading fallback for direct and framework-controlled transitions

## 2. Route Preparation

- [x] 2.1 Prefetch the unique portal destinations available to the signed-in user's role after the shared shell becomes interactive
- [x] 2.2 Add component tests covering pending feedback, pathname clearing, and role-scoped prefetch selection

## 3. Dashboard Bundle Isolation

- [x] 3.1 Extract manager dashboard Recharts rendering into a dynamically loaded chart component with a fixed-height placeholder
- [x] 3.2 Extract technician dashboard Recharts rendering into a dynamically loaded chart component with a fixed-height placeholder
- [x] 3.3 Verify dashboard values, labels, tooltips, and surrounding layouts remain unchanged

## 4. Validation

- [x] 4.1 Run frontend formatting, lint, typecheck, and focused component tests
- [x] 4.2 Run a production frontend build and verify portal route compilation succeeds
