import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DemoUser, ServiceOrder } from "@/lib/domain";
import { OrderQueue } from "./order-queue";
import {
  matchesOrderQuery,
  reviewState,
  technicianJobAction,
  technicianName,
} from "./order-selectors";

const technician: DemoUser = {
  id: "tech-1",
  name: "John",
  role: "technician",
  branch: "KL",
};
const order: ServiceOrder = {
  id: "order-1",
  orderNo: "ORDER001237",
  customerName: "Mei Ling",
  customerPhone: "60123456789",
  serviceType: "Repair",
  address: "Bangsar South",
  problemDescription: "Leaking",
  technicianId: "tech-1",
  status: "In Progress",
  quotedPrice: 260,
  branch: "KL",
  version: 1,
  createdAt: "2026-08-14T05:00:00Z",
  reviews: [],
  checklist: [],
  scheduleEvents: [],
  audit: [],
};

describe("shared order queue", () => {
  it("derives searchable assignee data and role actions", () => {
    expect(technicianName(order, [technician])).toBe("John");
    expect(matchesOrderQuery(order, "john", [technician])).toBe(true);
    expect(matchesOrderQuery(order, "unknown", [technician])).toBe(false);
    expect(technicianJobAction(order)).toBe("Continue");
    const correction = {
      ...order,
      reviews: [
        {
          outcome: "returned",
          reviewerName: "Farah",
          reviewedAt: "2026-08-14",
        },
      ],
    } as ServiceOrder;
    expect(reviewState(correction)).toBe("Needs correction");
    expect(technicianJobAction(correction)).toBe("Correct");
  });

  it("connects shared search and status filtering", () => {
    const onQueryChange = vi.fn();
    const onFilterChange = vi.fn();
    render(
      <OrderQueue
        title="Job queue"
        resultCount={1}
        query=""
        onQueryChange={onQueryChange}
        searchLabel="Search jobs"
        searchPlaceholder="Search jobs"
        filter="All"
        onFilterChange={onFilterChange}
        filterLabel="Filter job status"
        filterOptions={[
          { value: "All", label: "All" },
          { value: "Assigned", label: "Assigned" },
        ]}
        columns={["Order", "Action"]}
        gridClassName="grid-cols-2"
        emptyTitle="No jobs"
        emptyDescription="Try again"
      >
        <p>ORDER001237</p>
      </OrderQueue>,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search jobs" }), {
      target: { value: "Mei" },
    });
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filter job status" }),
      { target: { value: "Assigned" } },
    );
    expect(onQueryChange).toHaveBeenCalledWith("Mei");
    expect(onFilterChange).toHaveBeenCalledWith("Assigned");
    expect(screen.getByText("ORDER001237")).toBeInTheDocument();
  });

  it("shows a shared empty state", () => {
    render(
      <OrderQueue
        title="Review queue"
        resultCount={0}
        query=""
        onQueryChange={vi.fn()}
        searchLabel="Search"
        searchPlaceholder="Search"
        filter="All"
        onFilterChange={vi.fn()}
        filterLabel="Filter"
        filterOptions={[{ value: "All", label: "All" }]}
        columns={["Order"]}
        gridClassName="grid-cols-1"
        emptyTitle="No matching reviews"
        emptyDescription="Try another filter"
      >
        ignored
      </OrderQueue>,
    );
    expect(screen.getByText("No matching reviews")).toBeInTheDocument();
  });
});
