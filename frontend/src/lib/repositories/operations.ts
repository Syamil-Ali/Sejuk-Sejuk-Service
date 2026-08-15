import type {
  AppNotification,
  CreateOrderInput,
  ServiceOrder,
  UpdateOrderDetailsInput,
} from "@/lib/domain";

export interface OperationsSnapshot {
  orders: ServiceOrder[];
  notifications: AppNotification[];
}

export interface OperationsRepository {
  load(): Promise<OperationsSnapshot>;
  create(input: CreateOrderInput): Promise<string>;
  assign(order: ServiceOrder, technicianId: string): Promise<void>;
  start(order: ServiceOrder): Promise<void>;
  reschedule(order: ServiceOrder, to: string, reason: string): Promise<void>;
  updateOrderDetails(
    order: ServiceOrder,
    input: UpdateOrderDetailsInput,
  ): Promise<void>;
  saveChecklist(order: ServiceOrder, itemId: string, completed: boolean, note?: string): Promise<void>;
  replaceChecklist(order: ServiceOrder, titles: string[]): Promise<void>;
  complete(order: ServiceOrder, input: {workDone:string;extraCharges:number;remarks?:string;paymentAmount?:number;paymentMethod?:string;receiptEvidenceId?:string}): Promise<void>;
  review(order: ServiceOrder, outcome:"accepted"|"returned", notes?:string, reopenIds?:string[]): Promise<void>;
  close(order: ServiceOrder): Promise<void>;
  recordPayment(order: ServiceOrder, amount:number, method:string, notes?:string, receiptEvidenceId?:string): Promise<void>;
  markNotificationRead(id:string): Promise<void>;
  recordWhatsAppFeedbackOpened(orderId:string): Promise<void>;
  subscribe(refresh:()=>void): ()=>void;
}
