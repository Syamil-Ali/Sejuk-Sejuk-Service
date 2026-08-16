/**
 * Compact, URL-safe order identifiers.
 *
 * Orders keep a UUID primary key in the database, but URLs expose a short
 * opaque token instead: base64url of the UUID bytes, e.g.
 * `ahawqkwbqkwuqbk112hasajk`. Old UUID or ORDER-number links keep working
 * because the order detail page falls back to those lookups.
 */

const UUID_HEX = /^[0-9a-f]{32}$/i;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

export function encodeOrderId(id: string): string {
  const hex = id.replace(/-/g, "");
  if (!UUID_HEX.test(hex)) return id;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeOrderId(token: string): string | null {
  if (!TOKEN.test(token)) return null;
  const base64 = `${token.replace(/-/g, "+").replace(/_/g, "/")}==`;
  try {
    const binary = atob(base64);
    const hex = Array.from(binary, (char) =>
      char.charCodeAt(0).toString(16).padStart(2, "0"),
    ).join("");
    if (hex.length !== 32) return null;
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

/**
 * Builds the order detail URL from a hydrated order, preferring the stored
 * random public id and falling back to the UUID-derived token (demo mode).
 */
export function orderUrl(order: { id: string; publicId?: string }): string {
  return `/portal/orders/${order.publicId ?? encodeOrderId(order.id)}`;
}
