export interface OrderDraft {
  customerName?: string;
  customerPhone?: string;
  building?: string;
  address1?: string;
  address2?: string;
  postcode?: string;
  city?: string;
  state?: string;
  serviceType?: string;
  problemDescription?: string;
  quotedPrice?: string;
}

/** Maps AI-extracted document fields onto the new-order form defaults. */
export function extractionToOrderDraft(
  fields: Record<string, string>,
): OrderDraft {
  return {
    customerName: fields.customerName || undefined,
    customerPhone: fields.customerPhone || undefined,
    building: fields.building || undefined,
    address1: fields.address1 || undefined,
    address2: fields.address2 || undefined,
    postcode: fields.postcode || undefined,
    city: fields.city || undefined,
    state: fields.state || undefined,
    serviceType: fields.serviceType || undefined,
    problemDescription: fields.serviceDetails || undefined,
    quotedPrice: fields.amount || undefined,
  };
}

/** Applies a draft onto an uncontrolled order form by input name. */
export function applyOrderDraftToForm(
  form: HTMLFormElement,
  draft: OrderDraft,
) {
  for (const [name, value] of Object.entries(draft)) {
    if (!value) continue;
    const element = form.elements.namedItem(name);
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.value = value;
    }
  }
}
