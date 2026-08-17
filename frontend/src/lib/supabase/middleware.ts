import { NextResponse, type NextRequest } from "next/server";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function readAccessToken(request: NextRequest): string | null {
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-") || !cookie.name.endsWith("-auth-token")) {
      continue;
    }
    try {
      const raw = cookie.value.startsWith("base64-")
        ? cookie.value.slice("base64-".length)
        : cookie.value;
      const payload = JSON.parse(
        decodeBase64Url(raw),
      ) as { access_token?: string };
      if (payload.access_token) return payload.access_token;
    } catch {
      // Ignore malformed cookies; the client-side guard still applies.
    }
  }
  return null;
}

function hasUsableToken(accessToken: string | null): boolean {
  if (!accessToken) return false;
  try {
    const [, payload] = accessToken.split(".");
    if (!payload) return false;
    const claims = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    return (
      typeof claims.exp === "number" && claims.exp * 1000 > Date.now() + 60_000
    );
  } catch {
    return false;
  }
}

/**
 * Fast, network-free auth gate. Role-based redirects happen client-side in the
 * app shell; this only bounces logged-out users away from the portal using a
 * local JWT expiry check, so navigations no longer wait on Supabase calls.
 */
export async function refreshSupabaseSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPath = pathname === "/login" || pathname.startsWith("/portal");
  if (!protectedPath || DEMO_MODE) return NextResponse.next({ request });

  if (
    !hasUsableToken(readAccessToken(request)) &&
    pathname.startsWith("/portal")
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.searchParams.set("next", pathname);
    return NextResponse.redirect(destination);
  }

  return NextResponse.next({ request });
}
