import type { OrderStatus } from "./domain";

const currencyFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kuala_Lumpur",
});

/** Formats a numeric amount as Malaysian Ringgit for all customer-facing UI. */
export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

/** Formats an ISO timestamp in the application's fixed Kuala Lumpur timezone. */
export function formatDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

/** Keeps order identifiers visually consistent while tolerating incomplete data. */
export function formatOrderCode(value?: string | null) {
  return value?.trim().toUpperCase() || "—";
}

/** Produces a readable status label for values originating from storage or APIs. */
export function formatStatusLabel(value?: OrderStatus | string | null) {
  if (!value?.trim()) return "—";
  return value
    .trim()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
