"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import type { AuditEvent, Evidence } from "@/lib/domain";
import { decodeOrderId } from "@/lib/order-id";
import { ServiceJobHeader } from "@/components/service-job-header";
import { ServiceChecklist } from "@/features/checklist";
import {
  AssignmentPanel,
  AuditEventDialog,
  AuditHistory,
  ChecklistProgress,
  CompletionReport,
  ManagerActions,
  OrderInformation,
  ServiceDetails,
  TechnicianActions,
} from "@/features/orders";
import { ConfirmDialog } from "@/components/ui";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ctx = useDemo();
  const order = ctx.orders.find(
    (o) =>
      o.id === (decodeOrderId(id) ?? id) ||
      o.orderNo === id ||
      o.publicId === id,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [pendingTechnicianId, setPendingTechnicianId] = useState<string>();
  const [selectedAudit, setSelectedAudit] = useState<AuditEvent>();
  if (!order)
    return (
      <div className="card p-8">
        <h1 className="text-xl font-bold">Order not found</h1>
        <Link
          className="mt-4 inline-flex font-bold text-teal-700"
          href="/portal"
        >
          Return to workspace
        </Link>
      </div>
    );
  const tech = ctx.users.find((u) => u.id === order.technicianId);
  const orderConversation = ctx.conversations.find(
    (conversation) =>
      conversation.kind === "order" && conversation.orderId === order.id,
  );
  const latestOrderMessage = orderConversation?.messages.at(-1);
  const canSee =
    ctx.user?.role !== "technician" || order.technicianId === ctx.user.id;
  if (!canSee)
    return <p className="card p-6">You do not have access to this order.</p>;
  const safe = async (fn: () => void | Promise<void>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };
  return (
    <>
      <ServiceJobHeader order={order} technician={tech?.name} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-5">
          <ServiceDetails
            order={order}
            role={ctx.user!.role}
            onSave={async (input) => {
              try {
                await ctx.updateOrderDetails(order.id, input);
                toast.success("Service details updated");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not update service details",
                );
                throw error;
              }
            }}
          />
          <ServiceChecklist
            order={order}
            role={ctx.user!.role}
            onUpdate={(itemId, changes) =>
              safe(
                () => ctx.updateChecklistItem(order.id, itemId, changes),
                changes.completed
                  ? "Checklist step completed"
                  : "Checklist step saved",
              )
            }
            onCustomize={(titles) =>
              safe(
                () => ctx.setOrderChecklist(order.id, titles),
                "Checklist saved",
              )
            }
          />
          <CompletionReport order={order} />
          {ctx.user?.role === "technician" && (
            <TechnicianActions
              order={order}
              files={files}
              setFiles={setFiles}
              start={() => safe(() => ctx.startOrder(order.id), "Job started")}
              reschedule={(to, reason) =>
                safe(
                  () => ctx.rescheduleOrder(order.id, to, reason),
                  "Visit rescheduled",
                )
              }
              complete={(data) =>
                safe(
                  () =>
                    ctx.completeOrder(order.id, {
                      ...data,
                      evidence: files.map((f, i): Evidence => ({
                        id: `file-${i}-${Date.now()}`,
                        name: f.name,
                        size: f.size,
                        type: f.type.startsWith("image/")
                          ? "image"
                          : f.type.startsWith("video/")
                            ? "video"
                            : "pdf",
                      })),
                    }),
                  "Job marked done",
                )
              }
            />
          )}
          {ctx.user?.role === "manager" && (
            <ManagerActions
              order={order}
              review={(outcome, notes, reopenIds) =>
                safe(
                  () => ctx.reviewOrder(order.id, outcome, notes, reopenIds),
                  outcome === "accepted"
                    ? "Review accepted"
                    : "Returned for correction",
                )
              }
              close={() => safe(() => ctx.closeOrder(order.id), "Order closed")}
            />
          )}
        </div>
        <aside className="space-y-5">
          <AssignmentPanel
            order={order}
            technician={tech}
            users={ctx.users}
            role={ctx.user!.role}
            onSelectTechnician={setPendingTechnicianId}
            onFeedbackOpen={() => {
              void ctx.recordWhatsAppFeedbackOpened(order.id).catch((error) =>
                toast.error(error instanceof Error ? error.message : "Could not record WhatsApp handoff"),
              );
            }}
          />
          <section className="card !rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#0f1f38]">
              Order conversation
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#64748b]">
              {latestOrderMessage
                ? `${latestOrderMessage.senderName}: ${latestOrderMessage.body}`
                : "Keep job questions, corrections, and follow-ups attached to this order."}
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const conversationId = await ctx.ensureOrderConversation(
                    order.id,
                  );
                  router.push(
                    `/portal/messages?conversation=${conversationId}`,
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not open conversation",
                  );
                }
              }}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#cfe0f5] bg-[#eff6ff] px-4 text-sm font-medium text-[#1d4ed8]"
            >
              <MessageSquare className="size-4" /> Open conversation
            </button>
          </section>
          <ChecklistProgress order={order} />
          <AuditHistory events={order.audit} onSelect={setSelectedAudit} />
          <OrderInformation order={order} />
        </aside>
      </div>
      {pendingTechnicianId && (
        <ConfirmDialog
          open
          title={`Assign to ${ctx.users.find((user) => user.id === pendingTechnicianId)?.name}?`}
          description={`${ctx.users.find((user) => user.id === pendingTechnicianId)?.name} will become responsible for ${order.orderNo}.`}
          confirmLabel="Confirm assignment"
          onClose={() => setPendingTechnicianId(undefined)}
          onConfirm={() => {
            safe(
              () => ctx.assignOrder(order.id, pendingTechnicianId),
              "Technician assigned",
            );
            setPendingTechnicianId(undefined);
          }}
        />
      )}
      {selectedAudit && (
        <AuditEventDialog
          event={selectedAudit}
          orderNo={order.orderNo}
          onClose={() => setSelectedAudit(undefined)}
        />
      )}
    </>
  );
}
