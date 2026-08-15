## 1. Baseline and Structure

- [x] 1.1 Run and record the existing frontend lint, typecheck, unit-test, and production-build baseline.
- [x] 1.2 Create the `components/ui`, `components/layout`, `components/data-display`, `features`, and `hooks` module structure with consistent export conventions.
- [x] 1.3 Document and test shared formatting helpers for currency, dates, order codes, and status labels before replacing page-local implementations.

## 2. Shared Layout

- [x] 2.1 Extract typed role navigation configuration from `AppShell` without changing available links, labels, badges, or ordering.
- [x] 2.2 Extract `PortalSidebar`, sidebar sections, and sidebar user controls while retaining one universal desktop sidebar.
- [x] 2.3 Extract `MobileNavigation` and `PortalContent`, preserving route-specific viewport locking and scroll behavior.
- [x] 2.4 Add regression tests for admin, manager, and technician navigation visibility, active state, unread badges, and sign-out controls.

## 3. Reusable Presentation Primitives

- [x] 3.1 Extract shared section-card, metric-card, progress, and empty/loading/error-state components from the established visual patterns.
- [x] 3.2 Extract accessible search, status-filter, list-toolbar, and data-table primitives with typed configuration.
- [x] 3.3 Extract shared form-field and confirmation-dialog primitives while preserving labels, focus behavior, validation messaging, and keyboard interaction.
- [x] 3.4 Add focused component tests for interactive primitives and responsive/empty states.

## 4. Order Queues and Role Views

- [x] 4.1 Create shared order view-model selectors and a configurable `OrderQueue` foundation without embedding role authorization in presentation code.
- [x] 4.2 Migrate the admin Orders page to the shared queue and remove its replaced list/filter markup.
- [x] 4.3 Migrate the manager Reviews page to the shared queue while preserving review and correction actions.
- [x] 4.4 Migrate technician My Jobs to the shared queue while preserving technician-only scoping and job actions.
- [x] 4.5 Add regression tests for queue searching, filtering, status display, assignee display, empty results, navigation, and role-specific actions.

## 5. Analytics Dashboards

- [x] 5.1 Extract reusable date-range controls, KPI grids, chart containers, and leaderboard presentation from the dashboard pages.
- [x] 5.2 Migrate the manager dashboard to shared analytics components without changing its calculations or layout behavior.
- [x] 5.3 Migrate the technician dashboard to shared analytics components while retaining technician-scoped calculations and 100vh behavior.
- [x] 5.4 Add regression tests for date ranges, monetary totals, completed-job attribution, outstanding amounts, and empty datasets.

## 6. Order Detail and Field Workflow

- [x] 6.1 Extract order summary, service journey, service details, assignment, order information, and audit-history sections from the order-detail route.
- [x] 6.2 Extract checklist draft state and checklist presentation into focused feature components while preserving explicit save/update behavior.
- [x] 6.3 Extract completion, evidence, review/correction, postponement, and payment sections without changing validation or authorization behavior.
- [x] 6.4 Reduce the order-detail route to authorized data selection, action orchestration, and feature composition; remove replaced local helpers.
- [x] 6.5 Add regression tests for checklist saving, completion gating, evidence handling, assignment confirmation, correction reopening, postponement, payments, and audit details.

## 7. Communications and Remaining Routes

- [x] 7.1 Decompose Messages into conversation list, conversation header, message feed, mention support, and composer components with scoped conversation access unchanged.
- [x] 7.2 Reuse shared feedback and form primitives in Ops Assistant and Notifications while preserving internal chat scrolling and streaming states.
- [x] 7.3 Migrate Payments and order creation to shared presentation/form primitives without changing payment history, notes, outstanding calculations, or draft retention.
- [x] 7.4 Extract the payment-account toolbar, responsive list, rows, and status badges into a reusable payment feature component while preserving filtering and account selection.

## 8. Cleanup and Verification

- [x] 8.1 Remove obsolete duplicated components, page-local formatting helpers, dead imports, and empty directories after all consumers are migrated.
- [x] 8.2 Run lint, typecheck, unit tests, production build, and relevant end-to-end tests; resolve every regression introduced by the refactor.
- [x] 8.3 Manually verify primary admin, manager, and technician workflows at desktop and mobile widths, including viewport-contained pages and chat scrolling.
