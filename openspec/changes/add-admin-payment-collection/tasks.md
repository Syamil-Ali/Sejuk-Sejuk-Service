## 1. Payment Data and Rules

- [x] 1.1 Extend the order domain with additive payment records and backward-compatible legacy payment normalization
- [x] 1.2 Update shared payment summaries to total all payments and derive Unpaid, Partially paid, and Paid states
- [x] 1.3 Add unit tests for no payment, partial payments, multiple payments, full settlement, and legacy data

## 2. Administrative Collection Action

- [x] 2.1 Add an admin-only provider action for recording a later customer payment
- [x] 2.2 Validate positive amount, payment method, and no overpayment without changing service status
- [x] 2.3 Append payment metadata and a detailed order audit event for each collection

## 3. Payments Interface

- [x] 3.1 Add a universal admin Payments navigation destination using the existing sidebar component
- [x] 3.2 Build a responsive Payments page with summary cards and searchable/filterable account list
- [x] 3.3 Build account details and Record payment dialog with payment history, validation, and success/error feedback
- [x] 3.4 Update order details, reviews, and dashboards to consume the unified payment history summary

## 4. Verification

- [x] 4.1 Verify admin authorization, partial collection, full settlement, overpayment rejection, and independent service status behavior
- [x] 4.2 Run formatting, type checking, focused tests, lint, and production build; document any unrelated pre-existing failures

## 5. Payment Arrangement Notes

- [x] 5.1 Extend payment records and the admin collection action with backward-compatible optional notes
- [x] 5.2 Add a payment-notes field to the collection dialog and show saved notes in payment and order histories
- [x] 5.3 Include supplied payment notes in audit events and add focused tests for note normalization and omission
- [x] 5.4 Run formatting, type checking, focused tests, lint, and production build
