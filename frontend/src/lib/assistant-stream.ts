import type { StructuredResult } from "@/features/assistant";

export type AssistantCitation = {
  label: string;
  sourceType: string;
  sourceId: string;
  occurredAt?: string;
};
export type AssistantStreamResult = {
  answer: string;
  citations: AssistantCitation[];
  result?: StructuredResult;
  refusal: boolean;
};

type AssistantEvent = {
  type?: "delta" | "refusal" | "result" | "citation";
  content?: string;
  result?: StructuredResult;
  citation?: AssistantCitation;
};

export async function readAssistantResponse(
  response: Response,
  onUpdate?: (result: AssistantStreamResult) => void,
): Promise<AssistantStreamResult> {
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      payload?.error || "Production assistant is temporarily unavailable.",
    );
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const aggregate: AssistantStreamResult = {
    answer: "",
    citations: [],
    refusal: false,
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    blocks.forEach((block) => {
      applyEvent(aggregate, parseEvent(block));
      onUpdate?.(snapshot(aggregate));
    });
  }
  if (buffer.trim()) {
    applyEvent(aggregate, parseEvent(buffer));
    onUpdate?.(snapshot(aggregate));
  }
  return aggregate;
}

function snapshot(result: AssistantStreamResult): AssistantStreamResult {
  return { ...result, citations: [...result.citations] };
}

function parseEvent(block: string): AssistantEvent | undefined {
  const raw = block
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice(6);
  if (!raw) return undefined;
  return JSON.parse(raw) as AssistantEvent;
}

function applyEvent(aggregate: AssistantStreamResult, event?: AssistantEvent) {
  if (!event) return;
  if (event.type === "delta" || event.type === "refusal") {
    aggregate.answer += event.content ?? "";
    aggregate.refusal ||= event.type === "refusal";
  }
  if (event.type === "result" && event.result) aggregate.result = event.result;
  if (event.type === "citation" && event.citation)
    aggregate.citations.push(event.citation);
}
