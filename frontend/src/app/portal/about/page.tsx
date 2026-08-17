"use client";

import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Gauge,
  HardHat,
  ShieldCheck,
  Sparkles,
  Wallet,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useDemo } from "@/components/demo-provider";

const flow = [
  {
    label: "Order created",
    actor: "Admin",
    icon: ClipboardList,
    detail: "Intake with structured address, quote and notes — optionally filled by AI from a document.",
  },
  {
    label: "Technician assigned",
    actor: "Admin",
    icon: Building2,
    detail: "Technician is notified; a WhatsApp handoff link is available.",
  },
  {
    label: "In progress",
    actor: "Technician",
    icon: Wrench,
    detail: "Checklist items with notes and photo proof, plus private evidence uploads.",
  },
  {
    label: "Job done",
    actor: "Technician",
    icon: CheckCircle2,
    detail: "Completion report, optional payment with receipt, manager notified.",
  },
  {
    label: "Reviewed",
    actor: "Manager",
    icon: ShieldCheck,
    detail: "Accept, or return for correction with a reason and reopened items.",
  },
  {
    label: "Closed",
    actor: "Manager",
    icon: Gauge,
    detail: "Order archived and the KPI dashboard updates.",
  },
];

const roles = [
  {
    role: "Admin",
    icon: Building2,
    pages: "Orders · Payments",
    detail:
      "Create and assign orders, extract details from documents with AI, collect payments with attached receipts, and keep the audit history accurate.",
  },
  {
    role: "Technician",
    icon: HardHat,
    pages: "My jobs",
    detail:
      "Work the assigned queue on mobile: start jobs, save checklist proof, upload evidence, record payments with receipts, and hand off to the customer via WhatsApp.",
  },
  {
    role: "Manager",
    icon: Gauge,
    pages: "Reviews · Dashboard",
    detail:
      "Review completed jobs with warnings, accept or return work, close orders, and track KPIs. Ask the assistant about operations.",
  },
];

const ai = [
  {
    title: "Ops assistant",
    icon: Bot,
    detail:
      "Ask operational questions in plain language — orders, payments, performance, workload, analytical questions. Read-only and role-scoped.",
  },
  {
    title: "Extract with AI",
    icon: Sparkles,
    detail:
      "In the New order dialog, upload a quotation, invoice or form (PDF, DOCX, TXT, MD, photo) and the fields fill for review.",
  },
  {
    title: "Extract from receipt",
    icon: Wallet,
    detail:
      "In payment recording, upload a receipt and the amount, method and date pre-fill — and the receipt is attached to the payment.",
  },
];

export default function AboutPage() {
  const { user } = useDemo();
  return (
    <div className="w-full max-w-4xl space-y-6">
      <PageHeader
        title="How it works"
        description="A quick map of the system: the workflow, each role, the AI features, and the architecture behind it."
      />

      <section className="card !rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[#0f1f38]">
          The service workflow
        </h2>
        <p className="mt-1 text-xs text-[#64748b]">
          Order → Assignment → Service → Review → Close, with notifications at
          each handoff.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
          {flow.map((step, index) => (
            <div
              key={step.label}
              className="flex flex-col items-center gap-2 sm:flex-row sm:items-center"
            >
              <div className="w-full rounded-xl border border-[#dfe5ec] bg-[#f8fafc] p-3 sm:w-36">
                <span className="grid size-8 place-items-center rounded-lg bg-[#193a63] text-white">
                  <step.icon className="size-4" />
                </span>
                <p className="mt-2 text-xs font-semibold text-[#0f1f38]">
                  {step.label}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
                  {step.actor}
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-[#64748b]">
                  {step.detail}
                </p>
              </div>
              {index < flow.length - 1 && (
                <ArrowRight className="size-4 shrink-0 rotate-90 text-[#94a3b8] sm:rotate-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card !rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[#0f1f38]">Who does what</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {roles.map((entry) => (
            <div key={entry.role} className="rounded-xl border border-[#dfe5ec] p-4">
              <entry.icon className="size-5 text-[#2563eb]" />
              <p className="mt-2 text-sm font-semibold text-[#0f1f38]">
                {entry.role}
              </p>
              <p className="text-[11px] font-medium text-[#2563eb]">
                {entry.pages}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                {entry.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card !rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[#0f1f38]">
          AI features
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {ai.map((feature) => (
            <div key={feature.title} className="rounded-xl bg-[#f0f6ff] p-4">
              <feature.icon className="size-5 text-[#2563eb]" />
              <p className="mt-2 text-sm font-semibold text-[#0f1f38]">
                {feature.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                {feature.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card !rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-[#0f1f38]">
          Architecture at a glance
        </h2>
        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-[#475569]">
          <li>
            <strong>Frontend:</strong> Next.js app with a backend-for-frontend
            layer; secrets and AI keys stay server-side.
          </li>
          <li>
            <strong>Database:</strong> Supabase/PostgreSQL. Row-level security
            is the permission boundary; every write goes through versioned,
            role-checked RPCs with audit events.
          </li>
          <li>
            <strong>AI service:</strong> a separate FastAPI + Agno service using
            Gemini. It only reads data the signed-in user is allowed to see and
            can never write to the system.
          </li>
          <li>
            <strong>Files:</strong> evidence, receipts and documents live in
            private storage and open through short-lived signed URLs.
          </li>
        </ul>
      </section>

      <section className="card !rounded-2xl border-amber-200 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold text-[#7c4a03]">
          Where to start {user ? `(${user.role})` : ""}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#92600a]">
          {user?.role === "admin" &&
            "Open Orders and create one, or try Extract with AI on the New order dialog. Then record a payment from the Payments page."}
          {user?.role === "technician" &&
            "Open My jobs, start an assigned job, and work through the checklist. Payments and receipts are recorded during completion."}
          {user?.role === "manager" &&
            "Open Reviews to check completed jobs, then the Dashboard for KPIs. Ask the Ops assistant about workload or performance."}
        </p>
      </section>
    </div>
  );
}
