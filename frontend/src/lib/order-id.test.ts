import { describe, expect, it } from "vitest";
import { decodeOrderId, encodeOrderId } from "./order-id";

const UUID = "30000000-0000-0000-0000-000000000001";

describe("order id tokens", () => {
  it("encodes a UUID into a compact URL-safe token", () => {
    const token = encodeOrderId(UUID);
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(token).not.toContain("=");
    expect(token).not.toContain("+");
    expect(token).not.toContain("/");
  });

  it("round-trips back to the UUID", () => {
    expect(decodeOrderId(encodeOrderId(UUID))).toBe(UUID);
  });

  it("passes through non-UUID identifiers unchanged", () => {
    expect(encodeOrderId("ORDER000001")).toBe("ORDER000001");
    expect(decodeOrderId("ORDER000001")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(decodeOrderId("not-a-valid-token!!")).toBeNull();
    expect(decodeOrderId("")).toBeNull();
  });
});
