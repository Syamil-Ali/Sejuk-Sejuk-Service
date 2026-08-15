import { describe, expect, it } from "vitest";
import {
  composeAddress,
  orderSchema,
  serviceDetailsSchema,
  validateEvidence,
} from "./validation";

describe("order validation", () => {
  const valid = {
    customerName: "Ahmad",
    customerPhone: "0123456789",
    address: "No. 12, Shah Alam",
    problemDescription: "Not cooling properly",
    serviceType: "Repair",
    quotedPrice: 120,
  };
  it("accepts a complete order", () =>
    expect(orderSchema.safeParse(valid).success).toBe(true));
  it("rejects negative quote and short problem", () =>
    expect(
      orderSchema.safeParse({
        ...valid,
        quotedPrice: -1,
        problemDescription: "bad",
      }).success,
    ).toBe(false));
  it("accepts formatted phone numbers and strips them on save", () => {
    const parsed = orderSchema.safeParse({
      ...valid,
      customerPhone: "012-345 6789",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.customerPhone).toBe("0123456789");
  });
  it("rejects a phone number without enough digits", () =>
    expect(
      orderSchema.safeParse({ ...valid, customerPhone: "012-34" }).success,
    ).toBe(false));
  it("validates admin service detail edits and strips phone formatting", () => {
    const parsed = serviceDetailsSchema.safeParse({
      serviceType: "Repair",
      customerPhone: "012-345 6789",
      address: "12, Jalan Sejuk, Shah Alam",
      building: "12",
      address1: "Jalan Sejuk",
      city: "Shah Alam",
      scheduledAt: "2026-08-20T10:00",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.customerPhone).toBe("0123456789");
  });
});

describe("composeAddress", () => {
  it("combines structured fields into one address string", () => {
    expect(
      composeAddress({
        building: "12",
        address1: "Jalan Sejuk",
        address2: "Block B",
        postcode: "40100",
        city: "Shah Alam",
        state: "Selangor",
      }),
    ).toBe("12, Jalan Sejuk, Block B, 40100 Shah Alam, Selangor");
  });
  it("keeps a single-line address intact", () => {
    expect(composeAddress({ address1: "Cyberjaya, Selangor" })).toBe(
      "Cyberjaya, Selangor",
    );
  });
});

describe("evidence validation", () => {
  it("rejects more than six files", () =>
    expect(
      validateEvidence(
        Array.from(
          { length: 7 },
          (_, i) => new File(["x"], `${i}.jpg`, { type: "image/jpeg" }),
        ),
      ),
    ).toMatch(/six/));
  it("rejects unsupported formats", () =>
    expect(
      validateEvidence([
        new File(["x"], "script.exe", { type: "application/x-msdownload" }),
      ]),
    ).toMatch(/not a supported/));
  it("accepts supported evidence", () =>
    expect(
      validateEvidence([new File(["x"], "photo.jpg", { type: "image/jpeg" })]),
    ).toBeUndefined());
});
