import { describe, expect, it } from "vitest";
import { googleMapsSearchUrl } from "./maps";

describe("googleMapsSearchUrl", () => {
  it("encodes the address into a maps search query", () => {
    expect(googleMapsSearchUrl("12, Jalan Sejuk, Shah Alam")).toBe(
      "https://www.google.com/maps/search/?api=1&query=12%2C%20Jalan%20Sejuk%2C%20Shah%20Alam",
    );
  });
});
