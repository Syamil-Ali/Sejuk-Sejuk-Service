import {
  CalendarDays,
  ChevronRight,
  History,
  MapPin,
  Pencil,
  Phone,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  AuditEvent,
  Role,
  ServiceOrder,
  UpdateOrderDetailsInput,
} from "@/lib/domain";
import { localDateTime, money } from "@/lib/utils";
import { googleMapsSearchUrl } from "@/lib/maps";
import { FormField } from "@/components/ui";
import { composeAddress, serviceDetailsSchema } from "@/lib/validation";
import { services } from "./order-fields";

function Detail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="size-3.5" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            title="Open address in Google Maps"
            className="mt-0.5 inline-flex text-sm font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-[#2563eb] hover:decoration-[#2563eb]"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
        )}
      </div>
    </div>
  );
}

export function ServiceDetails({
  order,
  role,
  onSave,
}: {
  order: ServiceOrder;
  role?: Role;
  onSave?: (input: UpdateOrderDetailsInput) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = role === "admin" && order.status !== "Closed" && !!onSave;
  return (
    <section
      className={`card !rounded-xl p-5 ${order.adminNotes ? "" : "hidden sm:block"}`}
    >
      <h2 className="-mx-5 -mt-5 hidden items-center justify-between gap-2 border-b border-[#edf0f4] px-5 py-4 text-sm font-semibold text-[#0f1f38] sm:flex">
        Service details
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:border-[#93c5fd] hover:bg-[#f8fbff] hover:text-[#2563eb]"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
        )}
      </h2>
      {editing && canEdit && onSave ? (
        <ServiceDetailsForm
          order={order}
          onCancel={() => setEditing(false)}
          onSave={async (input) => {
            await onSave(input);
            setEditing(false);
          }}
        />
      ) : (
        <div className="mt-4 hidden gap-4 sm:grid sm:grid-cols-2">
        <Detail
          icon={Wrench}
          label="Service"
          value={`${order.serviceType} · ${money.format(order.quotedPrice)}`}
        />
        <Detail icon={Phone} label="Phone" value={order.customerPhone} />
        <Detail
          icon={MapPin}
          label="Address"
          value={order.address}
          href={googleMapsSearchUrl(order.address)}
        />
        <Detail
          icon={CalendarDays}
          label="Scheduled"
          value={
            order.scheduledAt
              ? localDateTime.format(new Date(order.scheduledAt))
              : "Not scheduled"
          }
        />
      </div>
      )}
      {order.adminNotes && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
          <strong>Admin notes</strong>
          <p className="mt-1 text-[#60716e]">{order.adminNotes}</p>
        </div>
      )}
    </section>
  );
}

function toDatetimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ServiceDetailsForm({
  order,
  onCancel,
  onSave,
}: {
  order: ServiceOrder;
  onCancel: () => void;
  onSave: (input: UpdateOrderDetailsInput) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    const raw = Object.fromEntries(formData);
    const parsed = serviceDetailsSchema.safeParse({
      ...raw,
      address: composeAddress(raw as Record<string, string>),
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [
            String(issue.path[0]),
            issue.message,
          ]),
        ),
      );
      toast.error("Check the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...parsed.data,
        scheduledAt: parsed.data.scheduledAt
          ? new Date(parsed.data.scheduledAt).toISOString()
          : undefined,
      });
    } catch {
      // Stay in edit mode; the page already surfaced the error.
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      className="mt-4 grid gap-4 sm:grid-cols-2"
    >
      <FormField
        id="edit-serviceType"
        label="Service"
        error={errors.serviceType}
      >
        <select
          id="edit-serviceType"
          name="serviceType"
          className="field"
          defaultValue={order.serviceType}
        >
          {services.map((service) => (
            <option key={service}>{service}</option>
          ))}
        </select>
      </FormField>
      <FormField
        id="edit-customerPhone"
        label="Phone"
        error={errors.customerPhone}
      >
        <input
          id="edit-customerPhone"
          name="customerPhone"
          inputMode="tel"
          maxLength={30}
          className="field"
          defaultValue={order.customerPhone}
        />
      </FormField>
      <FormField id="edit-building" label="Building / unit" hint="Optional">
        <input
          id="edit-building"
          name="building"
          maxLength={80}
          className="field"
          defaultValue={order.building || ""}
        />
      </FormField>
      <FormField
        id="edit-address1"
        label="Address line 1"
        error={errors.address}
      >
        <input
          id="edit-address1"
          name="address1"
          maxLength={200}
          className="field"
          defaultValue={order.address1 || order.address}
        />
      </FormField>
      <FormField
        id="edit-address2"
        label="Address line 2"
        hint="Optional"
        className="sm:col-span-2"
      >
        <input
          id="edit-address2"
          name="address2"
          maxLength={200}
          className="field"
          defaultValue={order.address2 || ""}
        />
      </FormField>
      <FormField id="edit-postcode" label="Postcode" hint="Optional">
        <input
          id="edit-postcode"
          name="postcode"
          maxLength={10}
          inputMode="numeric"
          className="field"
          defaultValue={order.postcode || ""}
        />
      </FormField>
      <FormField id="edit-city" label="City" hint="Optional">
        <input
          id="edit-city"
          name="city"
          maxLength={120}
          className="field"
          defaultValue={order.city || ""}
        />
      </FormField>
      <FormField
        id="edit-state"
        label="State"
        hint="Optional"
        className="sm:col-span-2"
      >
        <input
          id="edit-state"
          name="state"
          maxLength={120}
          className="field"
          defaultValue={order.state || ""}
        />
      </FormField>
      <FormField
        id="edit-scheduledAt"
        label="Scheduled"
        hint="Optional"
        error={errors.scheduledAt}
        className="sm:col-span-2"
      >
        <input
          id="edit-scheduledAt"
          name="scheduledAt"
          type="datetime-local"
          className="field"
          defaultValue={toDatetimeLocal(order.scheduledAt)}
        />
      </FormField>
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function ChecklistProgress({ order }: { order: ServiceOrder }) {
  const complete = order.checklist.filter((item) => item.completed).length;
  const total = order.checklist.length;
  return (
    <section className="rounded-xl bg-[#2563eb] p-5 text-white">
      <p className="text-[10px] font-medium uppercase tracking-[.12em] text-blue-100">
        Progress
      </p>
      <p className="mt-2 text-2xl font-medium">
        {complete}
        <span className="text-sm text-blue-100">/{total}</span>
      </p>
      <p className="mt-1 text-xs text-blue-100">checklist items done</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full bg-white"
          style={{ width: `${total ? (complete / total) * 100 : 0}%` }}
        />
      </div>
    </section>
  );
}

export function AuditHistory({
  events,
  onSelect,
}: {
  events: AuditEvent[];
  onSelect: (event: AuditEvent) => void;
}) {
  return (
    <section className="card !rounded-xl p-5">
      <h2 className="-mx-5 -mt-5 flex items-center gap-2 border-b border-[#edf0f4] px-5 py-4 text-sm font-semibold text-[#0f1f38]">
        <History className="size-4 text-teal-700" />
        Audit history
      </h2>
      <ol className="mt-4 max-h-80 space-y-4 overflow-y-auto overscroll-contain pr-2">
        {[...events].reverse().map((event, index, all) => (
          <li key={event.id} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-[#94a3b8]" />
              {index < all.length - 1 && (
                <span className="mt-1 min-h-4 w-px flex-1 bg-[#e2e8f0]" />
              )}
            </span>
            <button
              type="button"
              onClick={() => onSelect(event)}
              className="group min-w-0 flex-1 rounded-lg pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            >
              <p className="text-xs font-medium text-[#334155]">
                {event.action}
              </p>
              <p className="mt-0.5 text-xs text-[#94a3b8]">
                <span className="font-medium text-[#64748b]">
                  {event.actor}
                </span>{" "}
                · {localDateTime.format(new Date(event.at))}
              </p>
              {event.detail && (
                <p className="mt-1 line-clamp-2 text-xs text-[#64748b]">
                  {event.detail}
                </p>
              )}
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[#2563eb]">
                View changes <ChevronRight className="size-3" />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function OrderInformation({ order }: { order: ServiceOrder }) {
  const rows = [
    ["Order ID", order.orderNo],
    ["Type", order.serviceType],
    ["Created", localDateTime.format(new Date(order.createdAt))],
    [
      "Scheduled",
      order.scheduledAt
        ? localDateTime.format(new Date(order.scheduledAt))
        : "Not scheduled",
    ],
  ];
  return (
    <section className="card !rounded-xl p-5">
      <h2 className="-mx-5 -mt-5 border-b border-[#edf0f4] px-5 py-4 text-sm font-semibold text-[#0f1f38]">
        Order info
      </h2>
      <dl className="mt-4 space-y-2 text-xs">
        {rows.map(([label, value]) => (
          <div className="flex justify-between gap-3" key={label}>
            <dt className="text-[#64748b]">{label}</dt>
            <dd
              className={`text-right font-medium text-[#1e293b] ${label === "Order ID" ? "font-code" : ""}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
