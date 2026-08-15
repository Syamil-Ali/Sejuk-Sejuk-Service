import { describe, expect, it } from "vitest";
import {
  checklistProgress,
  checklistTemplates,
  createChecklist,
} from "./checklists";

describe("service checklists", () => {
  it("provides required defaults for every service type", () => {
    for (const titles of Object.values(checklistTemplates))
      expect(titles.length).toBeGreaterThan(1);
  });
  it("creates ordered incomplete items", () => {
    const items = createChecklist("Repair");
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(checklistProgress(items)).toEqual({
      completed: 0,
      total: 3,
      ready: false,
    });
  });
  it("becomes ready only when every required item is complete", () => {
    const items = createChecklist("Inspection").map((item) => ({
      ...item,
      completed: true,
    }));
    expect(checklistProgress(items).ready).toBe(true);
    items[0].completed = false;
    expect(checklistProgress(items).ready).toBe(false);
  });
  it("accepts an Admin-customized scope", () =>
    expect(
      createChecklist("Other", ["Confirm serial number", "Test unit"]).map(
        (item) => item.title,
      ),
    ).toEqual(["Confirm serial number", "Test unit"]));
});
