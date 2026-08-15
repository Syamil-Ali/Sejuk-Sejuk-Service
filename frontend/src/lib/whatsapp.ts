export function normalizeMalaysiaPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `6${digits}`;
  if (digits.startsWith("1")) return `60${digits}`;
  throw new Error("Enter a valid Malaysian phone number.");
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${normalizeMalaysiaPhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function assignmentMessage(
  orderNo: string,
  service: string,
  address: string,
  schedule?: string,
) {
  return `New job ${orderNo}: ${service} at ${address}.${schedule ? ` Scheduled ${schedule}.` : ""}`;
}

export function feedbackMessage(
  customer: string,
  orderNo: string,
  technician: string,
  time: string,
) {
  return `Hi ${customer}, job ${orderNo} has been completed by Technician ${technician} at ${time}. Please check and leave feedback. Thank you!`;
}
