## 1. Database Synchronization Contract

- [x] 1.1 Audit existing operational policies and RPCs against every frontend mutation and document the required mappings
- [x] 1.2 Add narrowly scoped missing operational RPCs or policies with caller-role and order-version checks
- [x] 1.3 Add operational tables to the realtime publication idempotently and cover changes with database tests
- [x] 1.4 Update frontend database types for the final local Supabase schema

## 2. Operations Repository

- [x] 2.1 Define the operations repository contract and shared snapshot/error types
- [x] 2.2 Implement role-scoped order and related-record loading with centralized database-to-domain mapping
- [x] 2.3 Implement order creation, assignment, start, reschedule, checklist, completion, review, correction, closure, and payment mutations
- [x] 2.4 Implement shared notification loading and read mutations
- [x] 2.5 Implement debounced realtime subscriptions with reconnect refresh and cleanup
- [x] 2.6 Add repository tests for hydration, mutation parameters, authorization errors, stale versions, and subscription refresh

## 3. Provider Integration

- [x] 3.1 Separate explicit demo-mode local initialization from production Supabase initialization
- [x] 3.2 Convert production mutation contracts and callers to await persisted repository commits
- [x] 3.3 Refresh authoritative state after successful mutations and recover current state after conflicts
- [x] 3.4 Expose truthful operational loading, synchronization error, and retry states without seeded fallback
- [x] 3.5 Preserve existing localStorage behavior only for explicit demo mode

## 4. Cross-Session Workflow Verification

- [x] 4.1 Add integration coverage proving technician completion appears in an active manager review queue
- [x] 4.2 Add integration coverage for manager correction, technician visibility, payments, and notification read synchronization
- [x] 4.3 Verify RLS prevents technicians from loading or mutating other technicians' orders
- [x] 4.4 Present the pre-filled customer WhatsApp feedback handoff only after successful completion and record handoff opening in audit history
- [x] 4.5 Verify the UI never claims WhatsApp delivery when only a deep link was opened

## 5. Validation

- [x] 5.1 Run Supabase migration reset and database tests against the local stack
- [x] 5.2 Run frontend formatting, lint, typecheck, unit tests, and production build
- [x] 5.3 Run the two-session end-to-end workflow against local Supabase and document required startup commands

## 6. Assessment Documentation and Promotion

- [x] 6.1 Rewrite README architecture, implemented-module, AI, security, setup, and limitation sections from verified behavior
- [x] 6.2 Document local Supabase as the first complete environment and hosted Supabase promotion as migration plus environment configuration
- [x] 6.3 Reassess every Programmer Assessment module against the completed local workflow and record any genuine remaining optional limitations
