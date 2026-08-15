"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createSeedNotifications,
  createSeedOrders,
  demoUsers,
} from "@/lib/demo-data";
import type {
  AppNotification,
  AuditEvent,
  ChecklistItem,
  CreateOrderInput,
  DemoUser,
  Evidence,
  MessageAttachment,
  OrganizationConversation,
  Role,
  ServiceOrder,
  UpdateOrderDetailsInput,
} from "@/lib/domain";
import { createChecklist } from "@/lib/checklists";
import { createManagerRescheduleNotifications } from "@/lib/notifications";
import {
  canAccessConversation,
  createSeedConversations,
  directKey,
} from "@/lib/communications";
import { announcementSchema, messageSchema } from "@/lib/validation";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { SupabaseCommunicationsRepository } from "@/lib/repositories/supabase-communications";
import { SupabaseOperationsRepository } from "@/lib/repositories/supabase-operations";
import {
  orderPaymentHistory,
  orderPaymentSummary,
  normalizePaymentNotes,
  validatePaymentCollection,
} from "@/lib/payments";

interface CompleteInput {
  workDone: string;
  extraCharges: number;
  remarks?: string;
  evidence: Evidence[];
  paymentAmount?: number;
  paymentMethod?: string;
  receiptEvidenceId?: string;
}

interface DemoContextValue {
  ready: boolean;
  operationalError?: string;
  retryOperations: () => Promise<void>;
  user?: DemoUser;
  users: DemoUser[];
  orders: ServiceOrder[];
  notifications: AppNotification[];
  conversations: OrganizationConversation[];
  signIn: (userId: string) => void;
  signOut: () => void;
  reset: () => void;
  createOrder: (input: CreateOrderInput) => Promise<ServiceOrder>;
  assignOrder: (orderId: string, technicianId: string) => Promise<void>;
  startOrder: (orderId: string) => Promise<void>;
  rescheduleOrder: (orderId: string, to: string, reason: string) => Promise<void>;
  updateOrderDetails: (
    orderId: string,
    input: UpdateOrderDetailsInput,
  ) => Promise<void>;
  completeOrder: (orderId: string, input: CompleteInput) => Promise<void>;
  recordPayment: (
    orderId: string,
    amount: number,
    method: string,
    notes?: string,
    receiptEvidenceId?: string,
  ) => Promise<void>;
  reviewOrder: (
    orderId: string,
    outcome: "accepted" | "returned",
    notes?: string,
    reopenItemIds?: string[],
  ) => Promise<void>;
  updateChecklistItem: (
    orderId: string,
    itemId: string,
    changes: Pick<ChecklistItem, "completed" | "note" | "evidence">,
  ) => Promise<void>;
  setOrderChecklist: (orderId: string, titles: string[]) => Promise<void>;
  closeOrder: (orderId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  recordWhatsAppFeedbackOpened: (orderId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    body: string,
    mentions?: string[],
    attachments?: MessageAttachment[],
  ) => Promise<void>;
  editMessage: (
    conversationId: string,
    messageId: string,
    body: string,
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  startDirectConversation: (participantId: string) => Promise<string>;
  createAnnouncement: (
    title: string,
    body: string,
    audienceRole: Role | "all",
  ) => Promise<string>;
  ensureOrderConversation: (orderId: string) => Promise<string>;
}

const DemoContext = createContext<DemoContextValue | null>(null);
const STORAGE = "sejuk-ops-demo-v1";

const now = () => new Date().toISOString();
const event = (
  action: string,
  actor: string,
  detail: string,
  context?: Pick<AuditEvent, "changes" | "relatedItems">,
) => ({
  id: crypto.randomUUID(),
  action,
  actor,
  at: now(),
  detail,
  ...context,
});

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [operationalError, setOperationalError] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [conversations, setConversations] = useState<
    OrganizationConversation[]
  >([]);
  const communicationsRepository = useMemo(
    () =>
      getPublicEnv().demoMode
        ? null
        : new SupabaseCommunicationsRepository(createClient()),
    [],
  );
  const operationsRepository = useMemo(
    () => getPublicEnv().demoMode ? null : new SupabaseOperationsRepository(createClient()),
    [],
  );
  const refreshOperations = useCallback(async () => {
    if (!operationsRepository) return;
    try {
      const snapshot = await operationsRepository.load();
      setOrders(snapshot.orders);
      setNotifications(snapshot.notifications);
      setOperationalError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operational data is unavailable.";
      setOperationalError(message);
      throw error;
    }
  }, [operationsRepository]);
  const commitOperation = useCallback(async <T,>(operation: () => Promise<T>) => {
    try {
      const result = await operation();
      await refreshOperations();
      return result;
    } catch (error) {
      try { await refreshOperations(); } catch { /* Preserve the mutation error. */ }
      throw error;
    }
  }, [refreshOperations]);
  const refreshConversations = useCallback(async () => {
    if (!communicationsRepository) return;
    setConversations(await communicationsRepository.list());
  }, [communicationsRepository]);

  useEffect(() => {
    if (operationsRepository) {
      let active = true;
      void createClient().auth.getSession().then(async ({data}) => {
        if (!active) return;
        const dbId=data.session?.user.id;
        const appId=Object.entries({"admin-1":"20000000-0000-0000-0000-000000000001","manager-1":"20000000-0000-0000-0000-000000000002","tech-ali":"20000000-0000-0000-0000-000000000003","tech-john":"20000000-0000-0000-0000-000000000004","tech-bala":"20000000-0000-0000-0000-000000000005","tech-yusoff":"20000000-0000-0000-0000-000000000006"}).find(([,id])=>id===dbId)?.[0];
        if (appId) setUserId(appId);
        if (dbId) await refreshOperations();
        if (active) setReady(true);
      }).catch((error)=>{if(active){setOperationalError(error instanceof Error ? error.message : "Operational data is unavailable.");setReady(true)}});
      return () => { active=false; };
    }
    const saved = window.localStorage.getItem(STORAGE);
    queueMicrotask(() => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            userId?: string;
            orders: ServiceOrder[];
            notifications: AppNotification[];
            conversations?: OrganizationConversation[];
          };
          setUserId(parsed.userId);
          setOrders(
            parsed.orders.map((order) => ({
              ...order,
              checklist: order.checklist || createChecklist(order.serviceType),
            })),
          );
          setNotifications(parsed.notifications);
          setConversations(
            parsed.conversations ||
              createSeedConversations(demoUsers, parsed.orders),
          );
        } catch {
          setOrders(createSeedOrders());
          setNotifications(createSeedNotifications());
          setConversations(
            createSeedConversations(demoUsers, createSeedOrders()),
          );
        }
      } else {
        setOrders(createSeedOrders());
        setNotifications(createSeedNotifications());
        setConversations(
          createSeedConversations(demoUsers, createSeedOrders()),
        );
      }
      setReady(true);
    });
  }, [operationsRepository, refreshOperations]);

  useEffect(() => {
    if (ready && !operationsRepository)
      window.localStorage.setItem(
        STORAGE,
        JSON.stringify({ userId, orders, notifications, conversations }),
      );
  }, [ready, userId, orders, notifications, conversations, operationsRepository]);

  useEffect(() => {
    if (!ready || !userId || !operationsRepository) return;
    return operationsRepository.subscribe(() => { void refreshOperations(); });
  }, [ready,userId,operationsRepository,refreshOperations]);

  useEffect(() => {
    if (!ready || !userId || !communicationsRepository) return;
    let active = true;
    const refresh = async () => {
      const next = await communicationsRepository.list();
      if (active) setConversations(next);
    };
    void refresh();
    const unsubscribe = communicationsRepository.subscribe(() => {
      void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [communicationsRepository, ready, userId]);

  const user = demoUsers.find((item) => item.id === userId);
  const requireUser = useCallback(() => {
    if (!user) throw new Error("Sign in is required.");
    return user;
  }, [user]);
  const update = useCallback(
    (id: string, fn: (order: ServiceOrder) => ServiceOrder) => {
      const current = orders.find((order) => order.id === id);
      if (!current) throw new Error("Order not found.");
      // Run guards synchronously so UI handlers can catch expected domain errors.
      const next = fn(current);
      setOrders((all) => all.map((order) => (order.id === id ? next : order)));
    },
    [orders],
  );

  const createOrder = useCallback(
    async (input: CreateOrderInput) => {
      if (operationsRepository) {
        const id=await commitOperation(() => operationsRepository.create(input));
        const created=(await operationsRepository.load()).orders.find(o=>o.id===id);
        if(!created) throw new Error("Created order could not be loaded.");
        return created;
      }
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Admin access required.");
      const sequence = 1250 + orders.length;
      const order: ServiceOrder = {
        ...input,
        id: crypto.randomUUID(),
        orderNo: `ORDER${String(sequence).padStart(6, "0")}`,
        branch: actor.branch,
        status: input.technicianId ? "Assigned" : "New",
        version: 1,
        createdAt: now(),
        reviews: [],
        scheduleEvents: [],
        checklist: createChecklist(input.serviceType, input.checklistTitles),
        audit: [
          event(
            "Order created",
            actor.name,
            input.technicianId
              ? "Created and assigned"
              : "Created without assignment",
          ),
        ],
      };
      if (input.technicianId)
        setNotifications((all) => [
          {
            id: crypto.randomUUID(),
            orderId: order.id,
            recipientId: input.technicianId,
            title: "New job assigned",
            body: `${order.orderNo} was created and assigned to you by ${actor.name}.`,
            createdAt: order.createdAt,
            category: "order",
            priority: "high",
            href: `/portal/orders/${order.id}`,
            dedupeKey: `assignment:${order.id}:1:${input.technicianId}`,
          },
          ...all,
        ]);
      setOrders((all) => [order, ...all]);
      return order;
    },
    [orders.length, requireUser, operationsRepository, commitOperation],
  );

  const assignOrder = useCallback(
    async (id: string, technicianId: string) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.assign(order,technicianId));return;}
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Admin access required.");
      update(id, (o) => {
        if (["Job Done", "Reviewed", "Closed"].includes(o.status))
          throw new Error("This order can no longer be reassigned.");
        const tech = demoUsers.find(
          (u) => u.id === technicianId && u.role === "technician",
        );
        if (!tech) throw new Error("Select an active technician.");
        setNotifications((all) => [
          {
            id: crypto.randomUUID(),
            orderId: o.id,
            recipientId: tech.id,
            title: "New job assigned",
            body: `${o.orderNo} was assigned to you by ${actor.name}.`,
            createdAt: now(),
            category: "order",
            priority: "high",
            href: `/portal/orders/${o.id}`,
            dedupeKey: `assignment:${o.id}:${o.version + 1}:${tech.id}`,
          },
          ...all,
        ]);
        setConversations((all) =>
          all.map((conversation) =>
            conversation.kind === "order" && conversation.orderId === o.id
              ? {
                  ...conversation,
                  members: [
                    ...conversation.members.filter(
                      (member) =>
                        member.userId !== o.technicianId &&
                        member.userId !== technicianId,
                    ),
                    { userId: technicianId },
                  ],
                }
              : conversation,
          ),
        );
        return {
          ...o,
          technicianId,
          status: "Assigned",
          version: o.version + 1,
          audit: [
            ...o.audit,
            event("Order assigned", actor.name, `Assigned to ${tech.name}`),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const startOrder = useCallback(
    async (id: string) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.start(order));return;}
      const actor = requireUser();
      update(id, (o) => {
        if (
          actor.role !== "technician" ||
          o.technicianId !== actor.id ||
          o.status !== "Assigned"
        )
          throw new Error("Only the assigned technician can start this job.");
        return {
          ...o,
          status: "In Progress",
          version: o.version + 1,
          audit: [
            ...o.audit,
            event("Work started", actor.name, "Status changed to In Progress"),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const rescheduleOrder = useCallback(
    async (id: string, to: string, reason: string) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.reschedule(order,to,reason));return;}
      const actor = requireUser();
      update(id, (o) => {
        if (
          actor.role !== "technician" ||
          o.technicianId !== actor.id ||
          !["Assigned", "In Progress"].includes(o.status)
        )
          throw new Error(
            "Only the assigned technician can reschedule an active job.",
          );
        if (new Date(to) <= new Date() || !reason.trim())
          throw new Error("Provide a reason and future time.");
        const changedAt = now();
        setNotifications((all) => [
          ...createManagerRescheduleNotifications({
            users: demoUsers,
            orderId: o.id,
            orderNo: o.orderNo,
            technicianName: actor.name,
            reason: reason.trim(),
            from: o.scheduledAt,
            to,
            createdAt: changedAt,
          }),
          ...all,
        ]);
        return {
          ...o,
          scheduledAt: to,
          version: o.version + 1,
          scheduleEvents: [
            ...o.scheduleEvents,
            {
              at: changedAt,
              from: o.scheduledAt,
              to,
              reason: reason.trim(),
              actor: actor.name,
            },
          ],
          audit: [
            ...o.audit,
            event("Job rescheduled", actor.name, reason.trim()),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const updateOrderDetails = useCallback(
    async (id: string, input: UpdateOrderDetailsInput) => {
      if (operationsRepository) {
        const order = orders.find((o) => o.id === id);
        if (!order) throw new Error("Order not found.");
        await commitOperation(() =>
          operationsRepository.updateOrderDetails(order, input),
        );
        return;
      }
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Admin access required.");
      update(id, (o) => {
        if (o.status === "Closed")
          throw new Error("Closed order cannot be edited.");
        return {
          ...o,
          serviceType: input.serviceType,
          customerPhone: input.customerPhone,
          address: input.address,
          scheduledAt: input.scheduledAt || undefined,
          building: input.building,
          address1: input.address1,
          address2: input.address2,
          postcode: input.postcode,
          city: input.city,
          state: input.state,
          version: o.version + 1,
          audit: [
            ...o.audit,
            event("Service details updated", actor.name, "Service details edited."),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const completeOrder = useCallback(
    async (id: string, input: CompleteInput) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.complete(order,input));return;}
      const actor = requireUser();
      update(id, (o) => {
        if (
          actor.role !== "technician" ||
          o.technicianId !== actor.id ||
          o.status !== "In Progress"
        )
          throw new Error(
            "Only the assigned technician can complete an in-progress job.",
          );
        const remaining = o.checklist.filter(
          (item) => item.required && !item.completed,
        );
        if (remaining.length)
          throw new Error(
            `Complete all checklist items first (${remaining.length} remaining).`,
          );
        if (!input.workDone.trim() || input.extraCharges < 0)
          throw new Error("Work done and valid charges are required.");
        if (input.evidence.length > 6)
          throw new Error("A maximum of six files is allowed.");
        const finalAmount = o.quotedPrice + input.extraCharges;
        if (
          input.paymentAmount !== undefined &&
          (input.paymentAmount < 0 ||
            input.paymentAmount > finalAmount ||
            !input.paymentMethod)
        )
          throw new Error(
            "Payment must not exceed the final amount and needs a method.",
          );
        const completedAt = now();
        setNotifications((all) => [
          {
            id: crypto.randomUUID(),
            orderId: o.id,
            recipientRole: "manager",
            title: "Job ready for review",
            body: `${o.orderNo} was completed by ${actor.name}.`,
            createdAt: completedAt,
            category: "order",
            priority: "high",
            href: `/portal/orders/${o.id}`,
            dedupeKey: `completed:${o.id}:${o.version + 1}`,
          },
          ...all,
        ]);
        return {
          ...o,
          status: "Job Done",
          version: o.version + 1,
          completion: {
            workDone: input.workDone.trim(),
            extraCharges: input.extraCharges,
            finalAmount,
            remarks: input.remarks?.trim(),
            completedAt,
            evidence: input.evidence,
            payment:
              input.paymentAmount !== undefined
                ? {
                    amount: input.paymentAmount,
                    method: input.paymentMethod!,
                    receivedAt: completedAt,
                  }
                : undefined,
          },
          payments:
            input.paymentAmount !== undefined
              ? [
                  {
                    id: crypto.randomUUID(),
                    amount: input.paymentAmount,
                    method: input.paymentMethod!,
                    receivedAt: completedAt,
                    recordedBy: actor.name,
                    source: "field",
                  },
                ]
              : [],
          audit: [
            ...o.audit,
            event(
              "Job completed",
              actor.name,
              `Final amount RM${finalAmount.toFixed(2)}`,
            ),
            ...(input.paymentAmount !== undefined
              ? [
                  event(
                    "Payment recorded",
                    actor.name,
                    `RM${input.paymentAmount.toFixed(2)} via ${input.paymentMethod}; outstanding RM${Math.max(finalAmount - input.paymentAmount, 0).toFixed(2)}`,
                  ),
                ]
              : []),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const recordPayment = useCallback(
    async (
      id: string,
      amount: number,
      method: string,
      notes?: string,
      receiptEvidenceId?: string,
    ) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.recordPayment(order,amount,method,notes,receiptEvidenceId));return;}
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Admin access required.");
      update(id, (order) => {
        if (!order.completion)
          throw new Error(
            "Payments can only be recorded after job completion.",
          );
        const summary = orderPaymentSummary(order);
        const paymentMethod = validatePaymentCollection(
          amount,
          method,
          summary.outstanding,
        );
        const paymentNotes = normalizePaymentNotes(notes);
        const receivedAt = now();
        const outstanding = Math.max(summary.outstanding - amount, 0);
        setNotifications((all) => [
          ...demoUsers
            .filter((candidate) => candidate.role === "manager")
            .map((manager) => ({
              id: crypto.randomUUID(),
              orderId: order.id,
              recipientId: manager.id,
              title: "Customer payment recorded",
              body: `${order.orderNo}: RM${amount.toFixed(2)} received; RM${outstanding.toFixed(2)} outstanding.`,
              createdAt: receivedAt,
              category: "payment" as const,
              priority: "normal" as const,
              href: `/portal/orders/${order.id}`,
              dedupeKey: `payment:${order.id}:${order.version + 1}:${manager.id}`,
            })),
          ...all,
        ]);
        return {
          ...order,
          version: order.version + 1,
          payments: [
            ...orderPaymentHistory(order),
            {
              id: crypto.randomUUID(),
              amount,
              method: paymentMethod,
              receivedAt,
              recordedBy: actor.name,
              source: "admin",
              notes: paymentNotes,
            },
          ],
          audit: [
            ...order.audit,
            event(
              "Payment recorded",
              actor.name,
              `RM${amount.toFixed(2)} via ${paymentMethod}; outstanding RM${outstanding.toFixed(2)}${paymentNotes ? `; note: ${paymentNotes}` : ""}`,
            ),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const reviewOrder = useCallback(
    async (
      id: string,
      outcome: "accepted" | "returned",
      notes?: string,
      reopenItemIds: string[] = [],
    ) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.review(order,outcome,notes,reopenItemIds));return;}
      const actor = requireUser();
      if (actor.role !== "manager") throw new Error("Manager access required.");
      update(id, (o) => {
        if (o.status !== "Job Done")
          throw new Error("Only completed jobs can be reviewed.");
        if (outcome === "returned" && !notes?.trim())
          throw new Error("A correction reason is required.");
        if (outcome === "returned" && o.technicianId)
          setNotifications((all) => [
            {
              id: crypto.randomUUID(),
              orderId: o.id,
              recipientId: o.technicianId,
              title: "Correction required",
              body: notes!.trim(),
              createdAt: now(),
              category: "correction",
              priority: "high",
              href: `/portal/orders/${o.id}`,
              dedupeKey: `correction:${o.id}:${o.version + 1}:${o.technicianId}`,
            },
            ...all,
          ]);
        if (outcome === "returned" && o.technicianId) {
          const createdAt = now();
          const correctionBody = `Correction requested: ${notes!.trim()}${
            reopenItemIds.length
              ? ` Reopened: ${o.checklist
                  .filter((item) => reopenItemIds.includes(item.id))
                  .map((item) => item.title)
                  .join(", ")}.`
              : ""
          }`;
          setConversations((all) => {
            const existing = all.find(
              (conversation) =>
                conversation.kind === "order" && conversation.orderId === o.id,
            );
            if (existing)
              return all.map((conversation) =>
                conversation.id === existing.id
                  ? {
                      ...conversation,
                      messages: [
                        ...conversation.messages,
                        {
                          id: crypto.randomUUID(),
                          conversationId: conversation.id,
                          senderId: actor.id,
                          senderName: actor.name,
                          body: correctionBody,
                          createdAt,
                          mentions: [o.technicianId!],
                          attachments: [],
                        },
                      ],
                    }
                  : conversation,
              );
            const admins = demoUsers
              .filter((candidate) => candidate.role === "admin")
              .map((candidate) => candidate.id);
            const id = crypto.randomUUID();
            return [
              {
                id,
                kind: "order",
                title: `${o.orderNo} · ${o.customerName}`,
                orderId: o.id,
                createdBy: actor.id,
                createdAt,
                members: [
                  ...new Set([actor.id, o.technicianId!, ...admins]),
                ].map((userId) => ({ userId })),
                messages: [
                  {
                    id: crypto.randomUUID(),
                    conversationId: id,
                    senderId: actor.id,
                    senderName: actor.name,
                    body: correctionBody,
                    createdAt,
                    mentions: [o.technicianId!],
                    attachments: [],
                  },
                ],
              },
              ...all,
            ];
          });
        }
        const checklist =
          outcome === "returned"
            ? o.checklist.map((item) =>
                reopenItemIds.includes(item.id)
                  ? {
                      ...item,
                      completed: false,
                      completedBy: undefined,
                      completedAt: undefined,
                    }
                  : item,
              )
            : o.checklist;
        return {
          ...o,
          checklist,
          status: outcome === "accepted" ? "Reviewed" : "In Progress",
          version: o.version + 1,
          reviews: [
            ...o.reviews,
            {
              outcome,
              notes: notes?.trim(),
              reviewerName: actor.name,
              reviewedAt: now(),
            },
          ],
          audit: [
            ...o.audit,
            event(
              outcome === "accepted"
                ? "Review accepted"
                : "Returned for correction",
              actor.name,
              notes?.trim() || "Accepted",
              {
                changes: [
                  {
                    label: "Service status",
                    before: "Job Done",
                    after: outcome === "accepted" ? "Reviewed" : "In Progress",
                  },
                ],
                relatedItems:
                  outcome === "returned"
                    ? o.checklist
                        .filter((item) => reopenItemIds.includes(item.id))
                        .map((item) => item.title)
                    : undefined,
              },
            ),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const updateChecklistItem = useCallback(
    async (
      orderId: string,
      itemId: string,
      changes: Pick<ChecklistItem, "completed" | "note" | "evidence">,
    ) => {
      if(operationsRepository){const order=orders.find(o=>o.id===orderId);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.saveChecklist(order,itemId,changes.completed,changes.note));return;}
      const actor = requireUser();
      update(orderId, (order) => {
        if (
          actor.role !== "technician" ||
          order.technicianId !== actor.id ||
          order.status !== "In Progress"
        )
          throw new Error(
            "Only the assigned technician can update this active checklist.",
          );
        const changedAt = now();
        return {
          ...order,
          checklist: order.checklist.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...changes,
                  note: changes.note?.trim(),
                  completedBy: changes.completed ? actor.name : undefined,
                  completedAt: changes.completed ? changedAt : undefined,
                }
              : item,
          ),
          audit: [
            ...order.audit,
            event(
              changes.completed
                ? "Checklist item completed"
                : "Checklist item updated",
              actor.name,
              order.checklist.find((item) => item.id === itemId)?.title ||
                "Checklist item",
            ),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );
  const setOrderChecklist = useCallback(
    async (orderId: string, titles: string[]) => {
      if(operationsRepository){const order=orders.find(o=>o.id===orderId);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.replaceChecklist(order,titles));return;}
      const actor = requireUser();
      if (actor.role !== "admin") throw new Error("Admin access required.");
      update(orderId, (order) => {
        if (!["New", "Assigned"].includes(order.status))
          throw new Error("Checklist can only be changed before work starts.");
        return {
          ...order,
          checklist: createChecklist(order.serviceType, titles),
          audit: [
            ...order.audit,
            event(
              "Checklist customized",
              actor.name,
              `${titles.length} required items`,
            ),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );

  const closeOrder = useCallback(
    async (id: string) => {
      if(operationsRepository){const order=orders.find(o=>o.id===id);if(!order)throw new Error("Order not found.");await commitOperation(()=>operationsRepository.close(order));return;}
      const actor = requireUser();
      if (actor.role !== "manager") throw new Error("Manager access required.");
      update(id, (o) => {
        if (o.status !== "Reviewed")
          throw new Error("Only reviewed orders can be closed.");
        return {
          ...o,
          status: "Closed",
          version: o.version + 1,
          audit: [
            ...o.audit,
            event("Order closed", actor.name, "Operational record locked"),
          ],
        };
      });
    },
    [requireUser, update, operationsRepository, orders, commitOperation],
  );
  const markNotificationRead = useCallback(async (id:string) => {
    if(operationsRepository){await commitOperation(()=>operationsRepository.markNotificationRead(id));return;}
    setNotifications(all=>all.map(n=>n.id===id?{...n,readAt:now()}:n));
  },[operationsRepository,commitOperation]);
  const markAllNotificationsRead = useCallback(async () => {
    if(!user)return;
    if(operationsRepository){await commitOperation(()=>Promise.all(notifications.filter(n=>!n.readAt).map(n=>operationsRepository.markNotificationRead(n.id))).then(()=>undefined));return;}
    const readAt=now();setNotifications(all=>all.map(n=>n.recipientId===user.id||n.recipientRole===user.role?{...n,readAt}:n));
  },[operationsRepository,notifications,commitOperation,user]);
  const recordWhatsAppFeedbackOpened = useCallback(async (orderId:string) => {
    if(operationsRepository){await commitOperation(()=>operationsRepository.recordWhatsAppFeedbackOpened(orderId));return;}
    const actor=requireUser();
    update(orderId,order=>({...order,audit:[...order.audit,event("WhatsApp feedback opened",actor.name,"Feedback handoff opened; delivery is not confirmed.")]}));
  },[operationsRepository,commitOperation,requireUser,update]);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      mentions: string[] = [],
      attachments: MessageAttachment[] = [],
    ) => {
      const actor = requireUser();
      const parsed = messageSchema.parse({ body, mentions });
      const conversation = conversations.find(
        (item) => item.id === conversationId,
      );
      if (!conversation || !canAccessConversation(conversation, actor, orders))
        throw new Error("You do not have access to this conversation.");
      if (
        attachments.length > 5 ||
        attachments.some((attachment) => attachment.size > 10_485_760)
      )
        throw new Error("Attach up to five files, maximum 10 MB each.");
      if (communicationsRepository) {
        await communicationsRepository.send(
          conversationId,
          parsed.body,
          parsed.mentions,
        );
        await refreshConversations();
        return;
      }
      const createdAt = now();
      const messageId = crypto.randomUUID();
      setConversations((all) =>
        all.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                members: item.members.map((member) =>
                  member.userId === actor.id
                    ? { ...member, lastReadAt: createdAt }
                    : member,
                ),
                messages: [
                  ...item.messages,
                  {
                    id: messageId,
                    conversationId,
                    senderId: actor.id,
                    senderName: actor.name,
                    body: parsed.body,
                    createdAt,
                    mentions: parsed.mentions,
                    attachments,
                  },
                ],
              }
            : item,
        ),
      );
      const recipients = conversation.members
        .map((member) => member.userId)
        .filter((id) => id !== actor.id);
      setNotifications((all) => [
        ...recipients.map((recipientId) => ({
          id: crypto.randomUUID(),
          orderId: conversation.orderId || "",
          recipientId,
          title: parsed.mentions.includes(recipientId)
            ? "You were mentioned"
            : "New message",
          body: `${actor.name}: ${parsed.body}`,
          createdAt,
          category: "message" as const,
          priority: parsed.mentions.includes(recipientId)
            ? ("high" as const)
            : ("normal" as const),
          href: `/portal/messages?conversation=${conversationId}`,
          dedupeKey: `message:${messageId}:${recipientId}`,
        })),
        ...all,
      ]);
    },
    [
      communicationsRepository,
      conversations,
      orders,
      refreshConversations,
      requireUser,
    ],
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, body: string) => {
      const actor = requireUser();
      const parsed = messageSchema.parse({ body, mentions: [] });
      if (communicationsRepository) {
        await communicationsRepository.edit(messageId, parsed.body);
        await refreshConversations();
        return;
      }
      setConversations((all) =>
        all.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId &&
                  message.senderId === actor.id &&
                  !message.deletedAt
                    ? { ...message, body: parsed.body, editedAt: now() }
                    : message,
                ),
              }
            : conversation,
        ),
      );
    },
    [communicationsRepository, refreshConversations, requireUser],
  );

  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      const actor = requireUser();
      if (communicationsRepository) {
        await communicationsRepository.remove(messageId);
        await refreshConversations();
        return;
      }
      setConversations((all) =>
        all.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: conversation.messages.map((message) =>
                  message.id === messageId && message.senderId === actor.id
                    ? { ...message, deletedAt: now() }
                    : message,
                ),
              }
            : conversation,
        ),
      );
    },
    [communicationsRepository, refreshConversations, requireUser],
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      const actor = requireUser();
      if (communicationsRepository) {
        await communicationsRepository.markRead(conversationId);
        await refreshConversations();
        return;
      }
      const readAt = now();
      setConversations((all) =>
        all.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                members: conversation.members.map((member) =>
                  member.userId === actor.id
                    ? { ...member, lastReadAt: readAt }
                    : member,
                ),
              }
            : conversation,
        ),
      );
    },
    [communicationsRepository, refreshConversations, requireUser],
  );

  const startDirectConversation = useCallback(
    async (participantId: string) => {
      const actor = requireUser();
      if (participantId === actor.id)
        throw new Error("Choose another team member.");
      const participant = demoUsers.find(
        (candidate) => candidate.id === participantId,
      );
      if (!participant) throw new Error("Team member not found.");
      if (communicationsRepository) {
        const id = await communicationsRepository.startDirect(participantId);
        await refreshConversations();
        return id;
      }
      const key = directKey(actor.id, participantId);
      const existing = conversations.find(
        (item) => item.kind === "direct" && item.directKey === key,
      );
      if (existing) return existing.id;
      const id = crypto.randomUUID();
      setConversations((all) => [
        {
          id,
          kind: "direct",
          title: `${actor.name} and ${participant.name}`,
          directKey: key,
          createdBy: actor.id,
          createdAt: now(),
          members: [{ userId: actor.id }, { userId: participantId }],
          messages: [],
        },
        ...all,
      ]);
      return id;
    },
    [
      communicationsRepository,
      conversations,
      refreshConversations,
      requireUser,
    ],
  );

  const createAnnouncement = useCallback(
    async (title: string, body: string, audienceRole: Role | "all") => {
      const actor = requireUser();
      if (!["admin", "manager"].includes(actor.role))
        throw new Error("Admin or manager access required.");
      const parsed = announcementSchema.parse({ title, body, audienceRole });
      if (communicationsRepository) {
        const id = await communicationsRepository.createAnnouncement(
          parsed.title,
          parsed.body,
          parsed.audienceRole,
        );
        await refreshConversations();
        return id;
      }
      const recipients = demoUsers.filter(
        (candidate) =>
          candidate.id !== actor.id &&
          (parsed.audienceRole === "all" ||
            candidate.role === parsed.audienceRole),
      );
      const id = crypto.randomUUID();
      const createdAt = now();
      setConversations((all) => [
        {
          id,
          kind: "announcement",
          title: parsed.title,
          audienceRole: parsed.audienceRole,
          createdBy: actor.id,
          createdAt,
          members: [actor, ...recipients].map((candidate) => ({
            userId: candidate.id,
          })),
          messages: [
            {
              id: crypto.randomUUID(),
              conversationId: id,
              senderId: actor.id,
              senderName: actor.name,
              body: parsed.body,
              createdAt,
              mentions: [],
              attachments: [],
            },
          ],
        },
        ...all,
      ]);
      setNotifications((all) => [
        ...recipients.map((recipient) => ({
          id: crypto.randomUUID(),
          orderId: "",
          recipientId: recipient.id,
          title: `Announcement: ${parsed.title}`,
          body: parsed.body,
          createdAt,
          category: "announcement" as const,
          priority: "normal" as const,
          href: `/portal/messages?conversation=${id}`,
          dedupeKey: `announcement:${id}:${recipient.id}`,
        })),
        ...all,
      ]);
      return id;
    },
    [communicationsRepository, refreshConversations, requireUser],
  );

  const ensureOrderConversation = useCallback(
    async (orderId: string) => {
      const actor = requireUser();
      const existing = conversations.find(
        (item) => item.kind === "order" && item.orderId === orderId,
      );
      if (existing) {
        if (!canAccessConversation(existing, actor, orders))
          throw new Error("You do not have access to this conversation.");
        return existing.id;
      }
      const order = orders.find((candidate) => candidate.id === orderId);
      if (
        !order ||
        (actor.role === "technician" && order.technicianId !== actor.id)
      )
        throw new Error("You do not have access to this order.");
      if (communicationsRepository) {
        const id = await communicationsRepository.ensureOrder(
          orderId,
          `${order.orderNo} · ${order.customerName}`,
        );
        await refreshConversations();
        return id;
      }
      const id = crypto.randomUUID();
      const memberIds = demoUsers
        .filter(
          (candidate) =>
            candidate.role !== "technician" ||
            candidate.id === order.technicianId,
        )
        .map((candidate) => candidate.id);
      setConversations((all) => [
        {
          id,
          kind: "order",
          title: `${order.orderNo} · ${order.customerName}`,
          orderId,
          createdBy: actor.id,
          createdAt: now(),
          members: memberIds.map((userId) => ({ userId })),
          messages: [],
        },
        ...all,
      ]);
      return id;
    },
    [
      communicationsRepository,
      conversations,
      orders,
      refreshConversations,
      requireUser,
    ],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      ready,
      operationalError,
      retryOperations: refreshOperations,
      user,
      users: demoUsers,
      orders,
      notifications,
      conversations,
      signIn: setUserId,
      signOut: () => { setUserId(undefined); if(operationsRepository) void createClient().auth.signOut(); },
      reset: () => {
        setUserId(undefined);
        setOrders(createSeedOrders());
        setNotifications(createSeedNotifications());
        setConversations(
          createSeedConversations(demoUsers, createSeedOrders()),
        );
        window.localStorage.removeItem(STORAGE);
      },
      createOrder,
      assignOrder,
      startOrder,
      rescheduleOrder,
      updateOrderDetails,
      completeOrder,
      recordPayment,
      reviewOrder,
      updateChecklistItem,
      setOrderChecklist,
      closeOrder,
      markNotificationRead,
      markAllNotificationsRead,
      recordWhatsAppFeedbackOpened,
      sendMessage,
      editMessage,
      deleteMessage,
      markConversationRead,
      startDirectConversation,
      createAnnouncement,
      ensureOrderConversation,
    }),
    [
      ready,
      operationalError,
      refreshOperations,
      user,
      orders,
      notifications,
      conversations,
      createOrder,
      assignOrder,
      startOrder,
      rescheduleOrder,
      updateOrderDetails,
      completeOrder,
      recordPayment,
      reviewOrder,
      updateChecklistItem,
      setOrderChecklist,
      closeOrder,
      markNotificationRead,
      markAllNotificationsRead,
      recordWhatsAppFeedbackOpened,
      operationsRepository,
      sendMessage,
      editMessage,
      deleteMessage,
      markConversationRead,
      startDirectConversation,
      createAnnouncement,
      ensureOrderConversation,
    ],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
