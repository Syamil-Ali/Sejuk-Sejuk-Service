import { afterEach, describe, expect, it } from "vitest";
import { classifyWithOpenAI, formatGroundedAnswer } from "./openai-provider";

const originalKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("OpenAI provider fallback", () => {
  it("declines classification when the provider is not configured", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(
      classifyWithOpenAI("How many jobs today?"),
    ).resolves.toBeNull();
  });
  it("returns the grounded deterministic answer during provider unavailability", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(
      formatGroundedAnswer([], "No records matched."),
    ).resolves.toEqual({ text: "No records matched.", aiFormatted: false });
  });
});
