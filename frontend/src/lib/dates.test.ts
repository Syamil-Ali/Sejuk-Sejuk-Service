import { describe, expect, it } from "vitest";
import { inclusiveRange, malaysiaWeek } from "./dates";

describe("Malaysia date ranges", () => {
  it("creates an exclusive end after the inclusive date", () => {
    const r = inclusiveRange("2026-08-10", "2026-08-11");
    expect(r.toExclusive.getTime() - r.from.getTime()).toBe(
      48 * 60 * 60 * 1000,
    );
  });
  it("rejects reversed ranges", () =>
    expect(() => inclusiveRange("2026-08-12", "2026-08-11")).toThrow());
  it("creates a seven-day week", () => {
    const r = malaysiaWeek(new Date("2026-08-11T06:00:00Z"));
    expect(r.toExclusive.getTime() - r.from.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });
});
