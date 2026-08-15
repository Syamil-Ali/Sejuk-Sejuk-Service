import { describe, expect, it } from "vitest";
import {
  applyOrderDraftToForm,
  extractionToOrderDraft,
} from "./document-draft";

describe("extractionToOrderDraft", () => {
  it("maps extracted fields onto new-order defaults", () => {
    expect(
      extractionToOrderDraft({
        customerName: "Ahmad",
        building: "22",
        address1: "Jalan Teknologi",
        city: "Cyberjaya",
        state: "Selangor",
        serviceType: "Cleaning",
        serviceDetails: "Clean indoor unit",
        amount: "260.00",
        date: "2026-08-20",
      }),
    ).toEqual({
      customerName: "Ahmad",
      building: "22",
      address1: "Jalan Teknologi",
      city: "Cyberjaya",
      state: "Selangor",
      serviceType: "Cleaning",
      problemDescription: "Clean indoor unit",
      quotedPrice: "260.00",
    });
  });

  it("drops empty extracted values", () => {
    expect(extractionToOrderDraft({ customerName: "", amount: "" })).toEqual({
      customerName: undefined,
      quotedPrice: undefined,
    });
  });

  it("applies a draft onto an existing form by field name", () => {
    const form = document.createElement("form");
    form.innerHTML =
      '<input name="customerName" /><input name="quotedPrice" /><textarea name="problemDescription"></textarea>';
    applyOrderDraftToForm(form, {
      customerName: "Ahmad",
      quotedPrice: "260.00",
      problemDescription: "Clean indoor unit",
    });
    expect((form.elements.namedItem("customerName") as HTMLInputElement).value).toBe("Ahmad");
    expect((form.elements.namedItem("quotedPrice") as HTMLInputElement).value).toBe("260.00");
    expect((form.elements.namedItem("problemDescription") as HTMLTextAreaElement).value).toBe(
      "Clean indoor unit",
    );
  });
});
