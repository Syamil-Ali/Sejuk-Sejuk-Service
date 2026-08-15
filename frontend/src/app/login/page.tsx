"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/components/demo-provider";
import { createClient } from "@/lib/supabase/client";
import { getPublicEnv } from "@/lib/env";
import { CompanyBrand } from "@/components/company-brand";

const icons = {
  admin: BriefcaseBusiness,
  technician: Wrench,
  manager: ShieldCheck,
};
const accountEmails: Record<string, string> = {
  "admin-1": "admin@sejuk.demo",
  "manager-1": "manager@sejuk.demo",
  "tech-ali": "ali@sejuk.demo",
  "tech-john": "john@sejuk.demo",
  "tech-bala": "bala@sejuk.demo",
  "tech-yusoff": "yusoff@sejuk.demo",
};

export default function LoginPage() {
  const { ready, user, users, signIn } = useDemo();
  const router = useRouter();
  const [busy, setBusy] = useState<string>();
  const publicEnv = getPublicEnv();
  const demoMode = publicEnv.demoMode;

  useEffect(() => {
    if (ready && user)
      router.replace(
        user.role === "admin"
          ? "/portal/orders"
          : user.role === "technician"
            ? "/portal/technician-dashboard"
            : "/portal/dashboard",
      );
  }, [ready, user, router]);

  async function selectIdentity(id: string, destination: string) {
    if (!ready || busy) return;
    setBusy(id);
    try {
      if (!demoMode) {
        const email = accountEmails[id];
        if (!email) throw new Error("This account has no configured login.");
        if (!publicEnv.NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD)
          throw new Error("The assessment account password is not configured.");
        const { error } = await createClient().auth.signInWithPassword({
          email,
          password: publicEnv.NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD,
        });
        if (error) throw error;
      }
      signIn(id);
      router.push(destination);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <main className="min-h-screen bg-white lg:grid lg:h-[calc(100vh/0.9)] lg:min-h-0 lg:grid-cols-[minmax(380px,42%)_1fr] lg:overflow-hidden">
      <section className="relative flex min-h-[44vh] overflow-hidden bg-[#4f7cac] p-7 text-white sm:p-12 lg:h-full lg:min-h-0 lg:p-12 xl:p-16">
        <div className="absolute -right-28 -top-28 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-28 size-[28rem] rounded-full bg-blue-700/20" />
        <div className="relative flex w-full flex-col">
          <CompanyBrand
            nameClassName="text-white"
            className="text-blue-50"
          />
          <div className="my-auto max-w-xl py-12 lg:py-6">
            <p className="text-xs font-black uppercase tracking-[.24em] text-blue-100">
              Field service, connected
            </p>
            <h1 className="mt-4 text-[2rem] font-black leading-[1.08] sm:text-[2.65rem] xl:text-5xl">
              From service request to confident review.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-teal-50/70 xl:text-base xl:leading-7">
              A practical operations workspace connecting office teams, field
              technicians, and managers from assignment through closure.
            </p>
          </div>
        </div>
      </section>
      <section className="flex min-h-[56vh] items-center bg-white px-5 py-10 sm:px-10 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-6 xl:px-14">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.22em] text-teal-700">
            Choose a workspace
          </p>
          <h2 className="mt-2 text-[1.65rem] font-black text-[#102925] xl:text-3xl">
            Continue as a {demoMode ? "demo " : ""}user
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#60716e]">
            Each identity has a different role and data scope. Select a card to
            enter the corresponding workspace.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {users.map((item) => {
              const Icon = icons[item.role];
              const roleLabel = `${item.role[0].toUpperCase()}${item.role.slice(1)}`;
              const roleTone =
                item.role === "admin"
                  ? "bg-[#dceeff] text-[#4f7cac] hover:bg-[#cbe4f8]"
                  : item.role === "manager"
                    ? "bg-[#f1dce4] text-[#7d5260] hover:bg-[#ead0da]"
                    : "bg-[#d9f2e5] text-[#146c43] hover:bg-[#c7ead7]";
              const destination =
                item.role === "admin"
                  ? "/portal/orders"
                  : item.role === "technician"
                    ? "/portal/technician-dashboard"
                    : "/portal/dashboard";
              return (
                <Link
                  role="button"
                  aria-disabled={!ready || Boolean(busy)}
                  data-ready={ready}
                  tabIndex={ready ? 0 : -1}
                  key={item.id}
                  href={destination}
                  onClick={(event) => {
                    event.preventDefault();
                    void selectIdentity(item.id, destination);
                  }}
                  className={`group flex min-h-36 flex-col rounded-lg p-5 text-left transition duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 aria-disabled:pointer-events-none aria-disabled:opacity-60 ${roleTone}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 place-items-center rounded-md bg-white/70 text-current transition group-hover:bg-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[.14em] text-current/75">
                      {roleLabel}
                    </span>
                  </div>
                  <div className="mt-3">
                    <strong className="block text-base text-[#102925]">
                      {busy === item.id ? "Signing in…" : item.name}
                    </strong>
                  </div>
                  <span className="mt-auto flex items-end justify-between pt-3 text-xs font-bold">
                    <span className="flex items-center gap-1.5 font-semibold opacity-75">
                      <MapPin className="size-3.5" />
                      {item.branch}
                    </span>
                    <span className="flex items-center gap-1.5 font-black">
                      Continue
                      <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
