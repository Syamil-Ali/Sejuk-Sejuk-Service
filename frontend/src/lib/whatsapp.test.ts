import { describe, expect, it } from "vitest";
import {
  assignmentMessage,
  feedbackMessage,
  normalizeMalaysiaPhone,
  whatsappLink,
} from "./whatsapp";

describe("WhatsApp helpers", () => {
  it.each([
    ["012-345 6789", "60123456789"],
    ["+60 12 345 6789", "60123456789"],
    ["60123456789", "60123456789"],
  ])("normalizes %s", (input, expected) =>
    expect(normalizeMalaysiaPhone(input)).toBe(expected),
  );
  it("encodes recipient and message", () =>
    expect(whatsappLink("0123456789", "A job & quote")).toBe(
      "https://wa.me/60123456789?text=A%20job%20%26%20quote",
    ));
  it("keeps the required assignment and feedback facts", () => {
    expect(
      assignmentMessage("ORDER1", "Repair", "Shah Alam", "tomorrow"),
    ).toContain("ORDER1");
    expect(feedbackMessage("Ahmad", "ORDER1", "Ali", "10:00")).toContain(
      "leave feedback",
    );
  });
});
