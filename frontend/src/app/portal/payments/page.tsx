"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  WalletCards,
} from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import type { ServiceOrder } from "@/lib/domain";
import { orderPaymentSummary } from "@/lib/payments";
import { money } from "@/lib/utils";
import { MetricCard } from "@/components/data-display";
import { PaymentAccountList, PaymentDialog } from "@/features/payments";

export default function PaymentsPage() {
  const { user, orders } = useDemo();
  const [selected, setSelected] = useState<ServiceOrder>();
  const accounts = useMemo(
    () => orders.filter((order) => order.completion),
    [orders],
  );
  const totals = useMemo(
    () =>
      accounts.reduce(
        (result, order) => {
          const payment = orderPaymentSummary(order);
          result.final += payment.finalAmount;
          result.received += payment.received;
          result.outstanding += payment.outstanding;
          if (payment.outstanding > 0) result.accounts += 1;
          return result;
        },
        { final: 0, received: 0, outstanding: 0, accounts: 0 },
      ),
    [accounts],
  );
  if (user?.role !== "admin")
    return <p className="card p-6">Admin access required.</p>;

  return (
    <div className="w-full">
      <header className="mb-7">
        <h1 className="page-title">
          Customer payments
        </h1>
<p className="mt-1.5 text-[13px] text-[#64748b] lg:text-sm">
Track and collect balances without holding up service completion.
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Outstanding accounts"
          value={String(totals.accounts)}
          icon={<WalletCards className="size-4" />}
          tone="amber"
        />
        <MetricCard
          label="Outstanding value"
          value={money.format(totals.outstanding)}
          icon={<CircleDollarSign className="size-4" />}
          tone="amber"
        />
        <MetricCard
          label="Customer payments"
          value={money.format(totals.received)}
          icon={<CheckCircle2 className="size-4" />}
          tone="green"
        />
        <MetricCard
          label="Final service value"
          value={money.format(totals.final)}
          icon={<Banknote className="size-4" />}
          tone="blue"
        />
      </div>

      <PaymentAccountList orders={accounts} onOpen={setSelected} />
      {selected && (
        <PaymentDialog
          order={orders.find((order) => order.id === selected.id) || selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </div>
  );
}
