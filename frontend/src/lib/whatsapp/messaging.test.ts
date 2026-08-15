import { describe, expect, it, vi } from "vitest";
import { ConsoleWhatsAppProvider, getWhatsAppProvider } from "./messaging";

describe("getWhatsAppProvider", () => {
  it("returns null when disabled", () => {
    expect(getWhatsAppProvider({ WHATSAPP_PROVIDER: "none" })).toBeNull();
  });

  it("returns the console provider for local demos", () => {
    expect(
      getWhatsAppProvider({ WHATSAPP_PROVIDER: "console" })?.name,
    ).toBe("console");
  });

  it("returns the meta provider when selected", () => {
    expect(
      getWhatsAppProvider({
        WHATSAPP_PROVIDER: "meta",
        WHATSAPP_ACCESS_TOKEN: "token",
        WHATSAPP_PHONE_NUMBER_ID: "123",
        WHATSAPP_VERIFY_TOKEN: "secret",
      })?.name,
    ).toBe("meta");
  });
});

describe("ConsoleWhatsAppProvider", () => {
  it("logs the message and returns a message id", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const sent = await new ConsoleWhatsAppProvider().send({
      to: "60123456789",
      body: "Hello",
    });
    expect(sent.provider).toBe("console");
    expect(sent.messageId).toBeTruthy();
    spy.mockRestore();
  });
});
