"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useDemo } from "@/components/demo-provider";
import { askOperations } from "@/lib/assistant";
import { getPublicEnv } from "@/lib/env";
import {
  readAssistantResponse,
  type AssistantCitation,
} from "@/lib/assistant-stream";
import { EmptyState, SectionCard } from "@/components/data-display";
import { FormField } from "@/components/ui";
import { StructuredResults, type StructuredResult } from "@/features/assistant";

type Turn = {
  id: string;
  question: string;
  answer: string;
  citations: AssistantCitation[];
  result?: StructuredResult;
  refusal?: boolean;
  error?: string;
  pending?: boolean;
};

const historyStorageKey = (userId: string) =>
  `sejuk-ops-assistant-history:${userId}`;
const threadStorageKey = (userId: string) =>
  `sejuk-ops-assistant-thread:${userId}`;

function restoreHistory(value: string | null): Turn[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (turn): turn is Turn =>
          typeof turn === "object" &&
          turn !== null &&
          typeof (turn as Turn).id === "string" &&
          typeof (turn as Turn).question === "string" &&
          typeof (turn as Turn).answer === "string",
      )
      .map((turn) => ({
        ...turn,
        citations: Array.isArray(turn.citations) ? turn.citations : [],
        answer:
          turn.pending && !turn.answer
            ? "The response was interrupted when you left this page. Please ask again."
            : turn.answer,
        pending: false,
      }));
  } catch {
    return [];
  }
}

const examples = {
  admin: [
    "Which orders are still unassigned?",
    "Show outstanding customer payments",
  ],
  technician: ["What jobs do I have tomorrow?", "Which jobs need correction?"],
  manager: [
    "Which technician completed the most jobs this week?",
    "How many jobs were completed today?",
  ],
};

export default function AssistantPage() {
  const { user, users, orders } = useDemo();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydratedHistoryKey, setHydratedHistoryKey] = useState<string | null>(
    null,
  );
  const controller = useRef<AbortController | null>(null);
  const feedEnd = useRef<HTMLDivElement | null>(null);
  const storageKey = user ? historyStorageKey(user.id) : null;

  useEffect(() => {
    if (!storageKey) return;
    const frame = requestAnimationFrame(() => {
      setHistory(restoreHistory(sessionStorage.getItem(storageKey)));
      setHydratedHistoryKey(storageKey);
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || hydratedHistoryKey !== storageKey) return;
    sessionStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, hydratedHistoryKey, storageKey]);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  useEffect(() => {
    feedEnd.current?.scrollIntoView({ block: "end" });
  }, [history]);
  if (!user) return null;

  async function ask(value: string) {
    const message = value.trim();
    if (!message || loading || !user) return;
    const currentUserId = user.id;
    const turnId = crypto.randomUUID();
    setQuestion("");
    setLoading(true);
    setHistory((items) => [
      ...items,
      {
        id: turnId,
        question: message,
        answer: "",
        citations: [],
        pending: true,
      },
    ]);
    controller.current = new AbortController();
    const savedThreadId = sessionStorage.getItem(
      threadStorageKey(currentUserId),
    );
    const threadId = savedThreadId || crypto.randomUUID();
    if (!savedThreadId)
      sessionStorage.setItem(threadStorageKey(currentUserId), threadId);
    const updateTurn = (update: Partial<Turn>) =>
      setHistory((items) =>
        items.map((turn) =>
          turn.id === turnId ? { ...turn, ...update } : turn,
        ),
      );
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, threadId }),
        signal: controller.current.signal,
      });
      const { answer, citations, result, refusal } =
        await readAssistantResponse(response, (partial) => updateTurn(partial));
      updateTurn({ answer, citations, result, refusal, pending: false });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        updateTurn({ answer: "Response stopped.", pending: false });
        return;
      }
      if (!getPublicEnv().demoMode) {
        const detail =
          error instanceof Error
            ? error.message
            : "Production assistant is temporarily unavailable.";
        updateTurn({
          answer: "Your question was not answered. Please retry.",
          citations: [],
          error: detail,
          pending: false,
        });
        return;
      }
      const demo = askOperations(message, orders, users, new Date(), user);
      updateTurn({
        answer: demo.answer,
        citations: [],
        error: "Demo mode · production assistant is disabled or unavailable.",
        pending: false,
      });
    } finally {
      setLoading(false);
      controller.current = null;
    }
  }

  return (
    <div className="flex min-h-0 flex-col xl:h-full xl:overflow-hidden">
      <PageHeader
        title="Operations assistant"
        description="Ask questions using only the operational data your role may access."
        action={
          <button
            className="btn-secondary"
            onClick={() => {
              controller.current?.abort();
              setHistory([]);
              if (storageKey) sessionStorage.removeItem(storageKey);
              sessionStorage.removeItem(threadStorageKey(user.id));
            }}
          >
            <RotateCcw className="size-4" />
            Reset
          </button>
        }
      />
      <div className="grid min-h-0 gap-6 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_300px] xl:overflow-hidden">
        <section className="card flex h-[600px] min-h-0 flex-col overflow-hidden xl:h-auto">
          <div
            className="relative min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-7"
            aria-live="polite"
          >
            {hydratedHistoryKey === storageKey && !history.length && (
              <div className="absolute inset-0 grid place-items-center p-5 sm:p-7">
                <EmptyState
                  icon={<Bot />}
                  title="Ask about service operations"
                  description="Answers remain read-only and permission scoped."
                />
              </div>
            )}
            {history.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <div className="flex items-end justify-end gap-2.5">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-3 text-sm leading-6 text-white">
                    {turn.question}
                  </div>
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-700"
                    aria-label="You"
                    title="You"
                  >
                    <UserRound className="size-4" />
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-600 text-white"
                    aria-label="Ops assistant"
                    title="Ops assistant"
                  >
                    <Bot className="size-4" />
                  </span>
                  <div
                    className={`max-w-[90%] rounded-2xl rounded-bl-sm border p-4 text-sm ${turn.refusal ? "border-amber-200 bg-amber-50" : "border-sky-100 bg-sky-50"}`}
                  >
                    {turn.error && (
                      <p className="mb-2 text-xs font-medium text-amber-700">
                        {turn.error}
                      </p>
                    )}
                    {turn.answer ? (
                      <p className="whitespace-pre-line leading-6">
                        {turn.answer}
                      </p>
                    ) : turn.pending ? (
                      <p className="flex items-center gap-2 text-slate-500">
                        <LoaderCircle className="size-4 animate-spin" />
                        Thinking…
                      </p>
                    ) : null}
                    {turn.result && <StructuredResults result={turn.result} />}
                    {!!turn.citations.length && (
                      <div className="mt-3 border-t border-sky-200 pt-3">
                        <p className="text-xs font-semibold">Sources</p>
                        {turn.citations.map((source, i) => (
                          <p
                            className="mt-1 text-xs text-slate-600"
                            key={`${source.sourceId}-${i}`}
                          >
                            {source.label}
                            {source.occurredAt ? ` · ${source.occurredAt}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={feedEnd} aria-hidden="true" />
          </div>
          <form
            className="border-t border-slate-200 bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(question);
            }}
          >
            <div className="flex items-end gap-2">
              <FormField
                id="question"
                label="Operational question"
                labelClassName="sr-only"
                className="min-w-0 flex-1"
              >
                <input
                  id="question"
                  maxLength={2_000}
                  className="field"
                  placeholder="Ask an operational question…"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  disabled={loading}
                />
              </FormField>
              {loading ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => controller.current?.abort()}
                  aria-label="Cancel"
                >
                  <Square className="size-4" />
                </button>
              ) : (
                <button className="btn-primary" aria-label="Send">
                  <Send className="size-4" />
                </button>
              )}
            </div>
          </form>
        </section>
        <aside className="space-y-5 xl:min-h-0 xl:overflow-y-auto">
          <SectionCard title="Try an example" contentClassName="space-y-2">
            {examples[user.role].map((item) => (
              <button
                key={item}
                onClick={() => void ask(item)}
                className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm hover:bg-sky-50"
              >
                {item}
              </button>
            ))}
          </SectionCard>
          <section className="rounded-2xl bg-slate-900 p-5 text-white">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4 text-sky-300" />
              Data boundary
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              The backend rechecks your role before every source lookup. Changes
              and arbitrary SQL are unavailable.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
