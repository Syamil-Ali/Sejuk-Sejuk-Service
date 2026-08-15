import { describe, expect, it } from "vitest";
import { readAssistantResponse } from "./assistant-stream";

function streamed(...events: object[]) {
  const body = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body));
        controller.close();
      },
    }),
  );
}

describe("readAssistantResponse", () => {
  it("aggregates ordered text, structured results, citations, and refusals", async () => {
    const updates: string[] = [];
    const result = await readAssistantResponse(
      streamed(
        { type: "delta", content: "One " },
        { type: "delta", content: "task." },
        { type: "result", result: { columns: ["jobs"], rows: [{ jobs: 1 }] } },
        {
          type: "citation",
          citation: {
            label: "Operations",
            sourceType: "sql",
            sourceId: "query-1",
          },
        },
        { type: "refusal", content: " Scoped." },
      ),
      (partial) => updates.push(partial.answer),
    );
    expect(result).toEqual({
      answer: "One task. Scoped.",
      citations: [
        { label: "Operations", sourceType: "sql", sourceId: "query-1" },
      ],
      result: { columns: ["jobs"], rows: [{ jobs: 1 }] },
      refusal: true,
    });
    expect(updates).toEqual([
      "One ",
      "One task.",
      "One task.",
      "One task.",
      "One task. Scoped.",
    ]);
  });

  it("surfaces safe upstream errors", async () => {
    await expect(
      readAssistantResponse(
        Response.json({ error: "Unavailable" }, { status: 503 }),
      ),
    ).rejects.toThrow("Unavailable");
  });
});
