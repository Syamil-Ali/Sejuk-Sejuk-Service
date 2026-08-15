import { z } from "zod";

export const messageSchema = z.object({
  body: z.string().trim().min(1, "Write a message.").max(2000),
  mentions: z.array(z.string()).max(20).default([]),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(1).max(2000),
  audienceRole: z.enum(["all", "admin", "technician", "manager"]),
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Enter the customer name.").max(120),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s()-]*$/, "Enter a valid Malaysian mobile number.")
    .refine(
      (value) =>
        /^(?:\+?6?01)[0-46-9]\d{7,8}$/.test(value.replace(/\D/g, "")),
      "Enter a valid Malaysian mobile number.",
    )
    .transform((value) => value.replace(/\D/g, "")),
  address: z
    .string()
    .trim()
    .min(8, "Enter a complete service address.")
    .max(500),
  building: z.string().trim().max(80).optional(),
  address1: z.string().trim().max(200).optional(),
  address2: z.string().trim().max(200).optional(),
  postcode: z.string().trim().max(10).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  problemDescription: z
    .string()
    .trim()
    .min(10, "Describe the problem in at least 10 characters.")
    .max(2_000),
  serviceType: z.enum([
    "Cleaning",
    "Repair",
    "Installation",
    "Gas Refill",
    "Inspection",
    "Other",
  ]),
  quotedPrice: z.coerce.number().min(0, "Quoted price cannot be negative."),
  technicianId: z.string().optional(),
  scheduledAt: z.string().optional(),
  adminNotes: z.string().max(1000).optional(),
});

export const serviceDetailsSchema = orderSchema
  .pick({
    customerPhone: true,
    serviceType: true,
    scheduledAt: true,
    building: true,
    address1: true,
    address2: true,
    postcode: true,
    city: true,
    state: true,
  })
  .extend({
    address: z
      .string()
      .trim()
      .min(8, "Enter a complete service address.")
      .max(500),
  });

export const completionSchema = z.object({
  workDone: z.string().trim().min(3, "Describe the work completed.").max(2_000),
  extraCharges: z.coerce.number().min(0),
  remarks: z.string().max(1000).optional(),
  paymentAmount: z.coerce.number().min(0).optional(),
  paymentMethod: z.string().optional(),
});

/**
 * Composes the structured address form fields into the single address string
 * stored on the order, e.g. "12, Jalan Sejuk, Block B, 40100 Shah Alam,
 * Selangor".
 */
export function composeAddress(fields: {
  building?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  state?: string;
}) {
  const part = (value?: string) => value?.trim() || "";
  return [
    [part(fields.building), part(fields.address1)].filter(Boolean).join(", "),
    part(fields.address2),
    [part(fields.postcode), part(fields.city)].filter(Boolean).join(" "),
    part(fields.state),
  ]
    .filter(Boolean)
    .join(", ");
}

export const supportedEvidence = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
];
export const MAX_EVIDENCE_FILES = 6;
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export function validateEvidence(files: File[]) {
  if (files.length > MAX_EVIDENCE_FILES)
    return "Upload no more than six files.";
  const bad = files.find(
    (file) =>
      !supportedEvidence.includes(file.type) || file.size > MAX_EVIDENCE_BYTES,
  );
  return bad
    ? `${bad.name} is not a supported file or exceeds 10 MB.`
    : undefined;
}
