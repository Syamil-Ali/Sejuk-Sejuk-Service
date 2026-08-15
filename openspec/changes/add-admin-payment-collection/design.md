## Context

See proposal.md for motivation. Service orders currently store at most one payment inside the completion report. Shared helpers derive received and outstanding totals from that single value, while order status transitions already remain independent from payment.

## Goals / Non-Goals

**Goals:**
- Support additive on-site and later customer payments without losing history.
- Reuse one payment-summary calculation across payments, reviews, order details, and dashboards.
- Restrict later collection entry to administrators and keep each entry auditable.
- Fit the existing client-side demo provider and persisted local state.

**Non-Goals:**
- Payment gateway integration, receipts, refunds, accounting exports, or technician payroll.
- Debt write-offs or balance waivers in this change.
- Blocking operational closure based on payment status.

## Decisions

1. Store payments as an order-level array rather than overwriting `completion.payment`. Each record includes an optional trimmed note for payment arrangements. An array supports multiple collections and preserves history. Existing completion payments will be normalized into the array without notes when calculating or hydrating data so saved demo data remains usable.
2. Add a provider action dedicated to recording later payments. It will enforce admin authorization, validate amount and method, normalize the optional note, reject overpayment, increment the order version, and append an audit event containing the note when supplied.
3. Derive `Unpaid`, `Partially paid`, and `Paid` from final amount versus summed payment entries. Derived status avoids contradictory persisted status values.
4. Add an admin-only `/portal/payments` queue using existing list, filter, dialog, typography, and sidebar primitives. A row action opens account details and the record-payment form, where optional notes are entered and later displayed beneath the matching history record.
5. Keep service and payment lifecycles independent. Payment mutation never changes `ServiceOrder.status`.

## Risks / Trade-offs

- [Persisted demo orders use the legacy single-payment shape] → Normalize legacy payment into the shared history representation and avoid double counting.
- [Client-side demo persistence is not transaction-safe] → Keep validation and mutation in one provider callback; production storage would require server-side authorization and atomic writes.
- [Financial totals could diverge across views] → Route every total and status through the shared payment-summary helper.
- [Closed orders may still show debt] → Present service status and payment status as separate labeled fields throughout the payment UI.

## Migration Plan

1. Extend domain types with payment records while retaining compatibility with the legacy completion payment.
2. Normalize existing records on read and use the array for new collections.
3. Update all payment calculations, then add the provider action and admin interface.
4. Roll back by hiding the payments route and retaining the legacy completion payment; additive history fields are non-destructive.
