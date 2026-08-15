import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  portalDestinations,
  usePortalNavigation,
} from "./use-portal-navigation";

describe("portal navigation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("returns only destinations available to the selected role", () => {
    expect(portalDestinations("technician")).toEqual([
      "/portal/technician-dashboard",
      "/portal/jobs",
      "/portal/messages",
      "/portal/assistant",
      "/portal/notifications",
      "/portal/about",
    ]);
    expect(portalDestinations("technician")).not.toContain("/portal/payments");
  });

  it("does not bulk prefetch destinations during local development", () => {
    vi.useFakeTimers();
    vi.stubEnv("NODE_ENV", "development");
    const prefetch = vi.fn();
    renderHook(() =>
      usePortalNavigation("/portal/orders", "admin", { prefetch }),
    );
    act(() => vi.advanceTimersByTime(250));
    expect(prefetch).not.toHaveBeenCalled();
  });

  it("prefetches only the targeted route on hover or focus", () => {
    const prefetch = vi.fn();
    const { result } = renderHook(() =>
      usePortalNavigation("/portal/orders", "admin", { prefetch }),
    );
    act(() => result.current.prepareNavigation("/portal/payments"));
    expect(prefetch).toHaveBeenCalledWith("/portal/payments");
    expect(prefetch).not.toHaveBeenCalledWith("/portal/orders");
    expect(prefetch).not.toHaveBeenCalledWith("/portal/reviews");
  });

  it("keeps role-scoped idle prefetching for production", () => {
    vi.useFakeTimers();
    vi.stubEnv("NODE_ENV", "production");
    const prefetch = vi.fn();
    renderHook(() =>
      usePortalNavigation("/portal/orders", "admin", { prefetch }),
    );
    act(() => vi.advanceTimersByTime(250));
    expect(prefetch).toHaveBeenCalledWith("/portal/payments");
    expect(prefetch).not.toHaveBeenCalledWith("/portal/orders");
  });

  it("shows pending feedback for a new destination and clears on pathname change", () => {
    vi.useFakeTimers();
    const router = { prefetch: vi.fn() };
    const { result, rerender } = renderHook(
      ({ pathname }) => usePortalNavigation(pathname, "manager", router),
      { initialProps: { pathname: "/portal/dashboard" } },
    );
    act(() => result.current.beginNavigation("/portal/reviews"));
    expect(result.current.pending).toBe(true);
    rerender({ pathname: "/portal/reviews" });
    expect(result.current.pending).toBe(false);
  });
});
