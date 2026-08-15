import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, FormField } from "./ui";
import {
  DataTable,
  EmptyState,
  ProgressBar,
  SearchField,
  StatusFilter,
} from "./data-display";

describe("shared frontend primitives", () => {
  it("exposes accessible search and filter controls", () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    render(
      <>
        <SearchField value="" onChange={onSearch} placeholder="Search orders" />
        <StatusFilter
          value="all"
          onChange={onFilter}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
          ]}
        />
      </>,
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), {
      target: { value: "Ahmad" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter status" }), {
      target: { value: "open" },
    });
    expect(onSearch).toHaveBeenCalledWith("Ahmad");
    expect(onFilter).toHaveBeenCalledWith("open");
  });

  it("renders empty and populated table states", () => {
    const { rerender } = render(
      <DataTable
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (row: { name: string }) => row.name,
          },
        ]}
        rows={[]}
        rowKey={(row) => row.name}
        empty={<EmptyState title="No records" />}
      />,
    );
    expect(screen.getByText("No records")).toBeInTheDocument();
    rerender(
      <DataTable
        columns={[
          {
            key: "name",
            header: "Name",
            cell: (row: { name: string }) => row.name,
          },
        ]}
        rows={[{ name: "Mei Ling" }]}
        rowKey={(row) => row.name}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mei Ling")).toBeInTheDocument();
  });

  it("clamps progress and exposes its current value", () => {
    render(<ProgressBar value={120} label="Checklist" />);
    expect(
      screen.getByRole("progressbar", { name: "Checklist" }),
    ).toHaveAttribute("aria-valuenow", "100");
  });

  it("connects field labels and errors", () => {
    render(
      <FormField id="amount" label="Amount" error="Amount is required">
        <input id="amount" aria-describedby="amount-description" />
      </FormField>,
    );
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Amount is required")).toHaveAttribute(
      "id",
      "amount-description",
    );
  });

  it("supports confirm, cancel, and closed dialog states", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Assign technician?"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    rerender(
      <ConfirmDialog
        open={false}
        title="Assign technician?"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
