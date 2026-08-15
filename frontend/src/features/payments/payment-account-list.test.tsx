import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ServiceOrder } from "@/lib/domain";
import { PaymentAccountList } from "./payment-account-list";

function account(overrides: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id: "order-1",
    orderNo: "ORDER001245",
    customerName: "Kumar",
    customerPhone: "60123400004",
    address: "Penang",
    problemDescription: "Install",
    serviceType: "Installation",
    quotedPrice: 1450,
    branch: "Penang",
    status: "Closed",
    version: 1,
    createdAt: "2026-08-12T00:00:00Z",
    reviews: [],
    scheduleEvents: [],
    audit: [],
    checklist: [],
    completion: {
      workDone: "Installed",
      extraCharges: 0,
      finalAmount: 1450,
      completedAt: "2026-08-12T01:00:00Z",
      evidence: [],
    },
    payments: [
      {
        id: "payment-1",
        amount: 1000,
        method: "Cash",
        receivedAt: "2026-08-12T02:00:00Z",
        recordedBy: "Nadia",
        source: "admin",
      },
    ],
    ...overrides,
  };
}

describe("PaymentAccountList", () => {
  it("filters accounts and emits the selected account", async () => {
    const paid = account({
      id: "order-2",
      orderNo: "ORDER001246",
      customerName: "Aisyah",
      payments: [
        {
          id: "payment-2",
          amount: 1450,
          method: "Card",
          receivedAt: "2026-08-12T02:00:00Z",
          recordedBy: "Nadia",
          source: "admin",
        },
      ],
    });
    const onOpen = vi.fn();
    render(<PaymentAccountList orders={[account(), paid]} onOpen={onOpen} />);

    expect(screen.getByText("1 result")).toBeInTheDocument();
    expect(screen.getByText("Kumar")).toBeInTheDocument();
    expect(screen.queryByText("Aisyah")).not.toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getByLabelText("Filter payment status"),
      "All",
    );
    await userEvent.type(
      screen.getByLabelText("Search payment accounts"),
      "Aisyah",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /ORDER001246 Aisyah/ }),
    );
    expect(onOpen).toHaveBeenCalledWith(paid);
  });
});
