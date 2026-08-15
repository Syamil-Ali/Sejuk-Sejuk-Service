import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD: optionalSecret,
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  AGNO_ASSISTANT_URL: z.string().url().optional(),
  AGNO_ASSISTANT_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  AGNO_ASSISTANT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(120_000)
    .default(30_000),
});

export function getPublicEnv() {
  const value = publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD:
      process.env.NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD,
  });
  return { ...value, demoMode: value.NEXT_PUBLIC_DEMO_MODE === "true" };
}

export function getServerEnv() {
  return serverSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
    NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD:
      process.env.NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    AGNO_ASSISTANT_URL: process.env.AGNO_ASSISTANT_URL,
    AGNO_ASSISTANT_ENABLED: process.env.AGNO_ASSISTANT_ENABLED,
    AGNO_ASSISTANT_TIMEOUT_MS: process.env.AGNO_ASSISTANT_TIMEOUT_MS,
  });
}

export function hasSupabaseEnv() {
  const env = getPublicEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
