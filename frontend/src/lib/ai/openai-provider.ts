import OpenAI from "openai";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";

export const intentSchema = z.object({
  intent: z.enum([
    "technician-completions",
    "technician-ranking",
    "completed-today",
    "current-workload",
    "unsupported",
  ]),
  technicianName: z.string().nullable(),
  period: z.enum(["today", "this-week", "last-week", "current", "unspecified"]),
});
export type ClassifiedIntent = z.infer<typeof intentSchema>;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "string",
      enum: [
        "technician-completions",
        "technician-ranking",
        "completed-today",
        "current-workload",
        "unsupported",
      ],
    },
    technicianName: { type: ["string", "null"] },
    period: {
      type: "string",
      enum: ["today", "this-week", "last-week", "current", "unspecified"],
    },
  },
  required: ["intent", "technicianName", "period"],
} as const;

function client() {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) return null;
  return {
    api: new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 8000,
      maxRetries: 1,
    }),
    model: env.OPENAI_MODEL,
  };
}

export async function classifyWithOpenAI(
  question: string,
): Promise<ClassifiedIntent | null> {
  const configured = client();
  if (!configured) return null;
  const response = await configured.api.responses.create({
    model: configured.model,
    input: [
      {
        role: "system",
        content:
          "Classify the manager's question into exactly one allow-listed service-operations intent. Never produce SQL. Use unsupported when the request is outside scope.",
      },
      { role: "user", content: question },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "operations_intent",
        strict: true,
        schema,
      },
    },
  });
  return intentSchema.parse(JSON.parse(response.output_text));
}

export async function formatGroundedAnswer(
  data: unknown,
  deterministicFallback: string,
) {
  const configured = client();
  if (!configured) return { text: deterministicFallback, aiFormatted: false };
  try {
    const response = await configured.api.responses.create({
      model: configured.model,
      input: `Format this structured service-operations result clearly and concisely. Do not add facts. If empty, state that no records matched.\n${JSON.stringify(data)}`,
      max_output_tokens: 400,
    });
    return {
      text: response.output_text || deterministicFallback,
      aiFormatted: Boolean(response.output_text),
    };
  } catch {
    return { text: deterministicFallback, aiFormatted: false };
  }
}
