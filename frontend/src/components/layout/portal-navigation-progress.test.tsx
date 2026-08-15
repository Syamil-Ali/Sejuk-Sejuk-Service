import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalNavigationProgress } from "./portal-navigation-progress";

describe("PortalNavigationProgress", () => {
  it("announces and displays pending navigation", () => {
    render(<PortalNavigationProgress pending />);
    expect(screen.getByRole("status", { name: "Loading page" })).toHaveClass(
      "opacity-100",
    );
  });

  it("stays mounted but hidden when navigation is idle", () => {
    const { container } = render(<PortalNavigationProgress pending={false} />);
    expect(container.firstChild).toHaveClass("opacity-0");
  });
});
