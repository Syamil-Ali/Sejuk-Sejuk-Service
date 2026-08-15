import type { ChecklistItem, ServiceType } from "./domain";

export const checklistTemplates: Record<ServiceType, string[]> = {
  Cleaning: [
    "Inspect unit condition and protect work area",
    "Clean filters, coil, blower, and drain line",
    "Test cooling, airflow, and drainage",
  ],
  Repair: [
    "Diagnose and confirm the reported fault",
    "Repair or replace the affected component",
    "Test operation and confirm fault is resolved",
  ],
  Installation: [
    "Confirm mounting location and electrical supply",
    "Install indoor/outdoor units and pipework",
    "Vacuum, commission, and test system",
    "Clean work area and brief customer",
  ],
  "Gas Refill": [
    "Inspect system and identify leak indicators",
    "Repair leak where applicable and pressure test",
    "Recharge refrigerant to specification",
    "Test operating pressure and cooling output",
  ],
  Inspection: [
    "Inspect unit, electrical, drainage, and performance",
    "Record findings and recommended actions",
  ],
  Other: [
    "Confirm requested scope with customer",
    "Complete agreed service work",
    "Test result and obtain customer acknowledgement",
  ],
};

export function createChecklist(
  serviceType: ServiceType,
  titles = checklistTemplates[serviceType],
): ChecklistItem[] {
  return titles
    .filter((title) => title.trim())
    .map((title, index) => ({
      id: crypto.randomUUID(),
      title: title.trim(),
      position: index + 1,
      required: true,
      completed: false,
      note: "",
      evidence: [],
    }));
}
export const checklistProgress = (items: ChecklistItem[]) => ({
  completed: items.filter((item) => item.completed).length,
  total: items.length,
  ready: items.every((item) => !item.required || item.completed),
});
