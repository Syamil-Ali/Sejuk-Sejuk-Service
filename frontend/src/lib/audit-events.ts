import type { AuditEvent } from "@/lib/domain";
import { localDateTime, money } from "@/lib/utils";

type AuditChange = NonNullable<AuditEvent["changes"]>[number];

export interface AuditEventRow {
  action: string;
  before_values?: Record<string, unknown> | null;
  after_values?: Record<string, unknown> | null;
}

export interface AuditEventContext {
  /** Resolves a profile id to a display name for change summaries. */
  technicianName?: (id: string) => string | undefined;
  /** Resolves a checklist item id to its title for change summaries. */
  checklistItemTitle?: (id: string) => string | undefined;
}

const ACTION_LABELS: Record<string, string> = {
  "order.created": "Order created",
  "order.assigned": "Order assigned",
  "order.started": "Work started",
  "order.rescheduled": "Visit rescheduled",
  "order.completed": "Job completed",
  "order.reviewed.accepted": "Review accepted",
  "order.reviewed.returned": "Returned for correction",
  "order.closed": "Order closed",
  "order.details_updated": "Service details updated",
  "Checklist item updated": "Checklist item updated",
  "Checklist customized": "Checklist customized",
  "Payment recorded": "Payment recorded",
  "whatsapp.feedback_opened": "Customer feedback opened",
  "checklist.items_reopened": "Checklist items reopened",
};

const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  assigned_technician_id: "Technician",
  scheduled_at: "Scheduled",
  customer_name: "Customer",
  customer_phone: "Phone",
  address: "Address",
  building: "Building / unit",
  address_line_1: "Address line 1",
  address_line_2: "Address line 2",
  postcode: "Postcode",
  city: "City",
  state: "State",
  problem_description: "Problem description",
  service_type: "Service type",
  quoted_price: "Quoted price",
  admin_notes: "Admin notes",
  amount: "Amount",
  method: "Payment method",
  notes: "Notes",
  completed: "Completed",
  note: "Note",
  item_id: "Checklist item",
  items: "Checklist items",
  itemIds: "Checklist items",
  delivery_confirmed: "Delivery confirmed",
};

/** Identity/audit bookkeeping that should never surface as a "change". */
const SKIPPED_FIELDS = new Set([
  "id",
  "version",
  "updated_at",
  "created_at",
  "created_by",
  "branch_id",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(valueText).join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => `${FIELD_LABELS[key] ?? key}: ${valueText(nested)}`)
      .join("; ");
  }
  return JSON.stringify(value);
}

function fieldText(
  key: string,
  value: unknown,
  context: AuditEventContext,
): string {
  if (value === null || value === undefined) return "";
  if (key === "assigned_technician_id")
    return context.technicianName?.(String(value)) ?? "Unassigned";
  if (key === "item_id")
    return context.checklistItemTitle?.(String(value)) ?? "Item";
  if (key === "quoted_price" || key === "amount")
    return money.format(Number(value));
  if (key === "scheduled_at") return localDateTime.format(String(value));
  if (key === "itemIds") {
    const ids = Array.isArray(value) ? value : [value];
    return ids
      .map((id) => context.checklistItemTitle?.(String(id)) ?? String(id))
      .join(", ");
  }
  return valueText(value);
}

function changesFor(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  context: AuditEventContext,
): AuditChange[] | undefined {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: AuditChange[] = [];
  for (const key of keys) {
    if (SKIPPED_FIELDS.has(key)) continue;
    const beforeValue = before[key];
    const afterValue = after[key];
    if (JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null))
      continue;
    changes.push({
      label: FIELD_LABELS[key] ?? key,
      before:
        beforeValue === undefined || beforeValue === null
          ? undefined
          : fieldText(key, beforeValue, context),
      after:
        afterValue === undefined || afterValue === null
          ? "—"
          : fieldText(key, afterValue, context),
    });
  }
  return changes.length > 0 ? changes : undefined;
}

function detailFor(
  action: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  context: AuditEventContext,
): string {
  const technicianName = (id: unknown) =>
    context.technicianName?.(String(id)) ?? "a technician";
  switch (action) {
    case "order.created": {
      const bits: string[] = [];
      if (after.customer_name) bits.push(`Customer: ${String(after.customer_name)}`);
      if (after.service_type) bits.push(String(after.service_type));
      if (after.quoted_price != null)
        bits.push(`Quote: ${money.format(Number(after.quoted_price))}`);
      if (after.assigned_technician_id)
        bits.push(`Assigned to ${technicianName(after.assigned_technician_id)}`);
      return bits.join(" · ") || "Order created";
    }
    case "order.assigned":
      return `Assigned to ${technicianName(after.assigned_technician_id)}.`;
    case "order.started":
      return "Work started on this order.";
    case "order.rescheduled": {
      const scheduled = (value: unknown) =>
        value ? localDateTime.format(String(value)) : "unscheduled";
      return before.scheduled_at &&
        after.scheduled_at &&
        String(before.scheduled_at) !== String(after.scheduled_at)
        ? `Rescheduled from ${scheduled(before.scheduled_at)} to ${scheduled(after.scheduled_at)}.`
        : `Scheduled for ${scheduled(after.scheduled_at)}.`;
    }
    case "order.completed":
      return "Job marked done.";
    case "order.reviewed.accepted":
      return "Review accepted.";
    case "order.reviewed.returned":
      return "Returned for correction.";
    case "order.closed":
      return "Order closed.";
    case "order.details_updated":
      return "Service details updated.";
    case "Checklist item updated":
      return after.completed
        ? "Checklist item completed."
        : "Checklist item reopened.";
    case "Checklist customized": {
      const count = Array.isArray(after.items) ? after.items.length : undefined;
      return count
        ? `Checklist customized to ${count} item${count === 1 ? "" : "s"}.`
        : "Checklist customized.";
    }
    case "Payment recorded": {
      const amount =
        after.amount != null ? money.format(Number(after.amount)) : "";
      return `Payment of ${amount} recorded${
        after.method ? ` via ${String(after.method)}` : ""
      }.`;
    }
    case "whatsapp.feedback_opened":
      return "Customer feedback link opened; delivery is not confirmed.";
    case "checklist.items_reopened": {
      const ids = Array.isArray(after.itemIds) ? after.itemIds : [];
      const titles = ids.map(
        (id) => context.checklistItemTitle?.(String(id)) ?? String(id),
      );
      return `Reopened ${titles.length} checklist item${
        titles.length === 1 ? "" : "s"
      } for correction.`;
    }
    default:
      return "";
  }
}

/**
 * Turns a raw audit_events row into display-ready fields: a friendly action
 * label, a short human-readable summary, and a structured before/after diff.
 */
export function describeAuditEvent(
  row: AuditEventRow,
  context: AuditEventContext = {},
): Pick<AuditEvent, "action" | "detail" | "changes" | "relatedItems"> {
  const rawAction = row.action ?? "";
  const before = isRecord(row.before_values) ? row.before_values : {};
  const after = isRecord(row.after_values) ? row.after_values : {};
  const relatedItems =
    rawAction === "checklist.items_reopened" && Array.isArray(after.itemIds)
      ? after.itemIds.map(
          (id) => context.checklistItemTitle?.(String(id)) ?? String(id),
        )
      : undefined;
  return {
    action: ACTION_LABELS[rawAction] ?? rawAction,
    detail: detailFor(rawAction, before, after, context),
    changes:
      rawAction === "order.created"
        ? undefined
        : changesFor(before, after, context),
    relatedItems,
  };
}
