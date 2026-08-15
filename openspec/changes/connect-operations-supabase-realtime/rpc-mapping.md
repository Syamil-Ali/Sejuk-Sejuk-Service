# Frontend mutation mapping

| Frontend action | Database boundary |
|---|---|
| create, assign, start, reschedule, complete, review, close | Existing same-named RPC |
| save checklist item | `update_checklist_item` |
| customize checklist | `replace_order_checklist` |
| record outstanding payment | `record_payment` |
| return selected work | `review_order`, then `reopen_checklist_items` |
| read notifications | RLS-scoped `notifications` update |

All order writes use the current `orders.version`; a stale version fails before a partial write.
