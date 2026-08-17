import { ExternalLink } from "lucide-react";
import type { DemoUser, Role, ServiceOrder } from "@/lib/domain";
import { localDateTime } from "@/lib/utils";
import {
  assignmentMessage,
  feedbackMessage,
  whatsappLink,
} from "@/lib/whatsapp";
import { WhatsAppDeliveryStatus } from "@/components/whatsapp-delivery-status";

export function AssignmentPanel({
  order,
  technician,
  users,
  role,
  onSelectTechnician,
  onFeedbackOpen,
}: {
  order: ServiceOrder;
  technician?: DemoUser;
  users: DemoUser[];
  role: Role;
  onSelectTechnician: (id: string) => void;
  onFeedbackOpen?: () => void;
}) {
  return (
    <section className="card !rounded-xl p-5">
      <h2 className="-mx-5 -mt-5 border-b border-line px-5 py-4 text-sm font-semibold text-ink">
        Assignment
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0f172a] text-sm font-semibold text-white">
          {(technician?.name || "?").charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1e293b]">
            {technician?.name || "Not assigned"}
          </p>
          <p className="truncate text-xs text-body">
            {technician?.branch || "Select a technician"}
          </p>
        </div>
        {technician && (
          <span className="ml-auto rounded-full border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
            Active
          </span>
        )}
      </div>
      {role === "admin" && order.status !== "Closed" && (
        <div className="mt-4">
          <select
            aria-label="Assign technician"
            className="field"
            value={order.technicianId || ""}
            onChange={(event) =>
              event.target.value && onSelectTechnician(event.target.value)
            }
          >
            <option value="">Select technician</option>
            {users
              .filter((user) => user.role === "technician")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
          </select>
          {technician && (
            <>
              <a
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp mt-3 w-full"
                href={whatsappLink(
                  technician.phone!,
                  assignmentMessage(
                    order.orderNo,
                    order.serviceType,
                    order.address,
                    order.scheduledAt
                      ? localDateTime.format(new Date(order.scheduledAt))
                      : undefined,
                  ),
                )}
              >
                WhatsApp technician <ExternalLink className="size-4" />
              </a>
              <WhatsAppDeliveryStatus orderId={order.id} />
            </>
          )}
        </div>
      )}
      {role === "technician" && order.status === "Job Done" && technician && (
        <a
          target="_blank"
          rel="noreferrer"
          className="btn-whatsapp mt-4 w-full"
          href={whatsappLink(
            order.customerPhone,
            feedbackMessage(
              order.customerName,
              order.orderNo,
              technician.name,
              localDateTime.format(new Date(order.completion!.completedAt)),
            ),
          )}
          onClick={onFeedbackOpen}
        >
          Open feedback message <ExternalLink className="size-4" />
        </a>
      )}
      {role === "technician" && order.status === "Job Done" && technician && (
        <p className="mt-2 text-center text-[11px] text-slate-500">Opens WhatsApp. Delivery is not confirmed.</p>
      )}
    </section>
  );
}
