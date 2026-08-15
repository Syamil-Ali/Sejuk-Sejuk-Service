import type { AppNotification, DemoUser, ServiceOrder } from "./domain";
import { createChecklist } from "./checklists";

export const demoUsers: DemoUser[] = [
  {
    id: "admin-1",
    name: "Nadia",
    role: "admin",
    branch: "Shah Alam",
    phone: "601122334455",
  },
  {
    id: "manager-1",
    name: "Farah",
    role: "manager",
    branch: "HQ",
    phone: "601133445566",
  },
  {
    id: "tech-ali",
    name: "Ali",
    role: "technician",
    branch: "Shah Alam",
    phone: "60123456789",
  },
  {
    id: "tech-john",
    name: "John",
    role: "technician",
    branch: "Kuala Lumpur",
    phone: "60134567890",
  },
  {
    id: "tech-bala",
    name: "Bala",
    role: "technician",
    branch: "Johor Bahru",
    phone: "60145678901",
  },
  {
    id: "tech-yusoff",
    name: "Yusoff",
    role: "technician",
    branch: "Penang",
    phone: "60156789012",
  },
];

const ago = (days: number, hour = 9) => {
  const value = new Date();
  value.setDate(value.getDate() - days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
};

const future = (days: number, hour = 10) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
};

export function createSeedOrders(): ServiceOrder[] {
  const orders = [
    {
      id: "order-1234",
      orderNo: "ORDER001234",
      customerName: "Ahmad",
      customerPhone: "60123400001",
      address: "No. 12, Jalan Sejuk, Shah Alam",
      problemDescription: "Air conditioner is not cooling",
      serviceType: "Cleaning",
      quotedPrice: 180,
      technicianId: "tech-ali",
      branch: "Shah Alam",
      scheduledAt: future(0, 14),
      status: "Assigned",
      version: 1,
      createdAt: ago(1),
      reviews: [],
      scheduleEvents: [],
      audit: [
        {
          id: "a-1",
          action: "Order assigned",
          actor: "Nadia (Admin)",
          at: ago(1),
          detail: "Assigned to Ali",
        },
      ],
    },
    {
      id: "order-1237",
      orderNo: "ORDER001237",
      customerName: "Mei Ling",
      customerPhone: "60123400002",
      address: "Bangsar South, Kuala Lumpur",
      problemDescription: "Indoor unit leaking water",
      serviceType: "Repair",
      quotedPrice: 260,
      technicianId: "tech-john",
      branch: "Kuala Lumpur",
      scheduledAt: future(1, 11),
      status: "In Progress",
      version: 2,
      createdAt: ago(2),
      reviews: [],
      scheduleEvents: [],
      audit: [
        {
          id: "a-2",
          action: "Work started",
          actor: "John",
          at: ago(0, 8),
          detail: "Status changed to In Progress",
        },
      ],
    },
    {
      id: "order-1241",
      orderNo: "ORDER001241",
      customerName: "Siti Aisyah",
      customerPhone: "60123400003",
      address: "Taman Universiti, Johor Bahru",
      problemDescription: "Low refrigerant pressure",
      serviceType: "Gas Refill",
      quotedPrice: 220,
      technicianId: "tech-bala",
      branch: "Johor Bahru",
      scheduledAt: ago(1, 10),
      status: "Job Done",
      version: 3,
      createdAt: ago(4),
      completion: {
        workDone: "Leak check and R32 gas refill",
        extraCharges: 40,
        finalAmount: 260,
        remarks: "Monitor for 48 hours",
        completedAt: ago(1, 12),
        evidence: [],
        payment: { amount: 260, method: "E-Wallet", receivedAt: ago(1, 12) },
      },
      reviews: [],
      scheduleEvents: [],
      audit: [
        {
          id: "a-3",
          action: "Job completed",
          actor: "Bala",
          at: ago(1, 12),
          detail: "Final amount RM260.00",
        },
      ],
    },
    {
      id: "order-1245",
      orderNo: "ORDER001245",
      customerName: "Kumar",
      customerPhone: "60123400004",
      address: "George Town, Penang",
      problemDescription: "Install new inverter unit",
      serviceType: "Installation",
      quotedPrice: 1450,
      technicianId: "tech-yusoff",
      branch: "Penang",
      scheduledAt: ago(2, 9),
      status: "Closed",
      version: 5,
      createdAt: ago(7),
      completion: {
        workDone: "Installed 1.5HP inverter unit and tested drainage",
        extraCharges: 0,
        finalAmount: 1450,
        completedAt: ago(2, 14),
        evidence: [
          {
            id: "e-1",
            name: "installed-unit.jpg",
            type: "image",
            size: 820000,
          },
        ],
        payment: {
          amount: 1000,
          method: "Bank Transfer",
          receivedAt: ago(2, 14),
        },
      },
      reviews: [
        {
          outcome: "accepted",
          reviewerName: "Farah (Manager)",
          reviewedAt: ago(2, 16),
          notes: "Installation checked",
        },
      ],
      scheduleEvents: [],
      audit: [
        {
          id: "a-4",
          action: "Order closed",
          actor: "Farah (Manager)",
          at: ago(2, 17),
          detail: "Review accepted",
        },
      ],
    },
  ] satisfies Omit<ServiceOrder, "checklist">[];
  return orders.map((order) => ({
    ...order,
    checklist: createChecklist(order.serviceType).map((item) =>
      order.status === "Job Done" || order.status === "Closed"
        ? {
            ...item,
            completed: true,
            note: "Completed during field service.",
            completedBy: demoUsers.find(
              (user) => user.id === order.technicianId,
            )?.name,
            completedAt: order.completion?.completedAt,
          }
        : item,
    ),
  }));
}

export function createSeedNotifications(): AppNotification[] {
  return [
    {
      id: "n-1",
      orderId: "order-1241",
      recipientRole: "manager",
      title: "Job ready for review",
      body: "ORDER001241 was completed by Bala.",
      createdAt: ago(1, 12),
    },
  ];
}
