export type Role = "admin" | "technician" | "manager";
export type OrderStatus =
  "New" | "Assigned" | "In Progress" | "Job Done" | "Reviewed" | "Closed";
export type ServiceType =
  | "Cleaning"
  | "Repair"
  | "Installation"
  | "Gas Refill"
  | "Inspection"
  | "Other";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  phone?: string;
  branch: string;
}

export interface Evidence {
  id: string;
  name: string;
  type: "image" | "video" | "pdf" | "receipt";
  size: number;
  storagePath?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  position: number;
  required: boolean;
  completed: boolean;
  note?: string;
  evidence: Evidence[];
  completedBy?: string;
  completedAt?: string;
}

export interface Completion {
  workDone: string;
  extraCharges: number;
  finalAmount: number;
  remarks?: string;
  completedAt: string;
  evidence: Evidence[];
  payment?: {
    amount: number;
    method: string;
    receiptName?: string;
    receivedAt: string;
  };
}

export interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  receivedAt: string;
  recordedBy: string;
  source: "field" | "admin";
  notes?: string;
  receipt?: Evidence;
}

export interface Review {
  outcome: "accepted" | "returned";
  notes?: string;
  reviewerName: string;
  reviewedAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: string;
  at: string;
  detail: string;
  changes?: { label: string; before?: string; after: string }[];
  relatedItems?: string[];
}

export interface ScheduleEvent {
  at: string;
  from?: string;
  to: string;
  reason: string;
  actor: string;
}

export interface ServiceOrder {
  id: string;
  /** Compact URL-safe public identifier stored on the row (base64url of id). */
  publicId?: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  address: string;
  building?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  state?: string;
  problemDescription: string;
  serviceType: ServiceType;
  quotedPrice: number;
  technicianId?: string;
  branch: string;
  scheduledAt?: string;
  adminNotes?: string;
  status: OrderStatus;
  version: number;
  createdAt: string;
  completion?: Completion;
  payments?: PaymentRecord[];
  reviews: Review[];
  scheduleEvents: ScheduleEvent[];
  audit: AuditEvent[];
  checklist: ChecklistItem[];
}

export interface AppNotification {
  id: string;
  orderId: string;
  recipientRole?: Role;
  recipientId?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  category?:
    | "order"
    | "schedule"
    | "correction"
    | "payment"
    | "message"
    | "announcement";
  priority?: "normal" | "high";
  href?: string;
  dedupeKey?: string;
}

export type ConversationKind = "order" | "direct" | "announcement";

export interface MessageAttachment {
  id: string;
  name: string;
  type: "image" | "pdf" | "file";
  size: number;
  storagePath?: string;
}

export interface OrganizationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  mentions: string[];
  attachments: MessageAttachment[];
}

export interface ConversationMember {
  userId: string;
  lastReadAt?: string;
}

export interface OrganizationConversation {
  id: string;
  kind: ConversationKind;
  title: string;
  orderId?: string;
  directKey?: string;
  audienceRole?: Role | "all";
  createdBy: string;
  createdAt: string;
  members: ConversationMember[];
  messages: OrganizationMessage[];
}

export interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  address: string;
  building?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  state?: string;
  problemDescription: string;
  serviceType: ServiceType;
  quotedPrice: number;
  technicianId?: string;
  scheduledAt?: string;
  adminNotes?: string;
  checklistTitles?: string[];
}

export interface UpdateOrderDetailsInput {
  serviceType: ServiceType;
  customerPhone: string;
  address: string;
  scheduledAt?: string;
  building?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  state?: string;
}
