## Why

Orders can be completed with no payment or a partial payment, but administrators currently have no dedicated place to find outstanding balances or record money collected later. This leaves the operational workflow complete while the financial follow-up remains manual and unaudited.

## What Changes

- Add an admin-only Payments view with totals and a searchable, filterable order queue.
- Show unpaid, partially paid, and paid orders with final amount, amount received, and outstanding balance.
- Allow an administrator to record one or more subsequent customer payments without changing the service order status.
- Preserve payment method, timestamp, recording actor, and optional payment-arrangement notes in an order-level payment history and audit trail.
- Prevent overpayment and automatically update payment status after each collection.

## Capabilities

### New Capabilities

- `admin-payment-collection`: Administrative visibility and collection of outstanding customer balances after field service.

### Modified Capabilities

None.

## Impact

- Extends the service-order payment data model from a single completion payment to an additive payment history.
- Updates the demo provider actions and persistence migration behavior.
- Adds an admin navigation destination and responsive payment collection page/dialog.
- Updates shared payment calculations and affected dashboards/order details while preserving existing service status transitions.
