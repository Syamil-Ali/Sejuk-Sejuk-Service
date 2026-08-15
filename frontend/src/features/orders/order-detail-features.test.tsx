import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceChecklist } from "@/features/checklist";
import type { AuditEvent, DemoUser, ServiceOrder } from "@/lib/domain";
import { AssignmentPanel } from "./assignment-panel";
import { AuditHistory, ServiceDetails } from "./order-detail-sections";
import { ManagerActions, TechnicianActions } from "./field-service-actions";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const tech: DemoUser = {
  id: "tech-1",
  name: "John",
  role: "technician",
  branch: "KL",
  phone: "60123456789",
};
const order: ServiceOrder = {
  id: "order-1",
  orderNo: "ORDER001237",
  customerName: "Mei Ling",
  customerPhone: "60111111111",
  address: "Bangsar",
  problemDescription: "Leak",
  serviceType: "Repair",
  quotedPrice: 260,
  technicianId: tech.id,
  branch: "KL",
  status: "In Progress",
  version: 1,
  createdAt: "2026-08-14T01:00:00Z",
  reviews: [],
  scheduleEvents: [],
  audit: [],
  checklist: [
    {
      id: "item-1",
      title: "Diagnose fault",
      position: 1,
      required: true,
      completed: false,
      evidence: [],
    },
  ],
};

describe("order detail feature components", () => {
  it("keeps checklist changes local until Save item is pressed", () => {
    const onUpdate = vi.fn();
    render(
      <ServiceChecklist order={order} role="technician" onUpdate={onUpdate} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Complete Diagnose fault" }),
    );
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(onUpdate).toHaveBeenCalledWith(
      "item-1",
      expect.objectContaining({ completed: true }),
    );
  });

  it("shows attached checklist proof to the manager", () => {
    const withEvidence: ServiceOrder = {
      ...order,
      checklist: [
        {
          ...order.checklist[0],
          evidence: [
            {
              id: "evidence-1",
              name: "diagnosis.jpg",
              type: "image",
              size: 1024,
            },
          ],
        },
      ],
    };
    render(<ServiceChecklist order={withEvidence} role="manager" />);
    expect(screen.getByText("Proof: diagnosis.jpg")).toBeInTheDocument();
  });

  it("lets an admin edit service details and strips phone formatting", async () => {
    const onSave = vi.fn(async () => {});
    render(<ServiceDetails order={order} role="admin" onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "012-345 6789" },
    });
    fireEvent.change(screen.getByLabelText("Address line 1"), {
      target: { value: "12, Jalan Sejuk, Shah Alam" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          customerPhone: "0123456789",
          serviceType: "Repair",
          address: "12, Jalan Sejuk, Shah Alam",
        }),
      ),
    );
  });

  it("keeps assignment selection outside the presentation component", () => {
    const onSelect = vi.fn();
    render(
      <AssignmentPanel
        order={{ ...order, technicianId: undefined, status: "New" }}
        users={[tech]}
        role="admin"
        onSelectTechnician={onSelect}
      />,
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Assign technician" }),
      { target: { value: tech.id } },
    );
    expect(onSelect).toHaveBeenCalledWith(tech.id);
  });

  it("returns selected checklist items for manager correction", () => {
    const review = vi.fn();
    render(
      <ManagerActions
        order={{ ...order, status: "Job Done" }}
        review={review}
        close={vi.fn()}
      />,
    );
    fireEvent.change(
      screen.getByPlaceholderText("Review notes or required correction reason"),
      { target: { value: "Retest drainage" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Reopen for correction/ }),
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Return for correction" }),
    );
    expect(review).toHaveBeenCalledWith("returned", "Retest drainage", [
      "item-1",
    ]);
  });

  it("submits postponement details without mutating the order", () => {
    const reschedule = vi.fn();
    render(
      <TechnicianActions
        order={order}
        files={[]}
        setFiles={vi.fn()}
        start={vi.fn()}
        reschedule={reschedule}
        complete={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Need to reschedule instead?" }),
    );
    fireEvent.change(screen.getByPlaceholderText("Reason for postponement"), {
      target: { value: "Customer unavailable" },
    });
    const time = document.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    fireEvent.change(time, { target: { value: "2026-08-20T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save new schedule" }));
    expect(reschedule).toHaveBeenCalledWith(
      expect.stringContaining("2026-08-20"),
      "Customer unavailable",
    );
  });

  it("opens full audit details from the bounded audit list", () => {
    const event: AuditEvent = {
      id: "audit-1",
      action: "Returned for correction",
      actor: "Farah",
      at: "2026-08-14T02:00:00Z",
      detail: "Retest drainage",
      relatedItems: ["Diagnose fault"],
    };
    const onSelect = vi.fn();
    render(<AuditHistory events={[event]} onSelect={onSelect} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Returned for correction/ }),
    );
    expect(onSelect).toHaveBeenCalledWith(event);
  });
});
