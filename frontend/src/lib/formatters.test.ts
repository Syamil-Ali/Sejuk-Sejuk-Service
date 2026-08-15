import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDateTime,
  formatOrderCode,
  formatStatusLabel,
} from "./formatters";

describe("shared formatters", () => {
  it("formats Malaysian currency consistently", () => {
    expect(formatCurrency(180)).toMatch(/RM\s?180\.00/);
  });

  it("uses the Kuala Lumpur timezone for timestamps", () => {
    expect(formatDateTime("2026-08-14T05:00:00.000Z")).toContain("1:00 pm");
    expect(formatDateTime("invalid")).toBe("—");
  });

  it("normalizes order codes", () => {
    expect(formatOrderCode(" order001234 ")).toBe("ORDER001234");
    expect(formatOrderCode()).toBe("—");
  });

  it("creates readable status labels", () => {
    expect(formatStatusLabel("in_progress")).toBe("In Progress");
    expect(formatStatusLabel("Job Done")).toBe("Job Done");
  });
});
