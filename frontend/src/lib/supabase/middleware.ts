import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshSupabaseSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") return response;
  if (!user && request.nextUrl.pathname.startsWith("/portal")) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(destination);
  }
  if (!user) return response;

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role as "admin" | "technician" | "manager" | undefined;
  const defaults = {
    admin: "/portal/orders",
    technician: "/portal/technician-dashboard",
    manager: "/portal/dashboard",
  } as const;
  const shared = [
    "/portal/messages",
    "/portal/assistant",
    "/portal/notifications",
  ];
  const allowed =
    role === "admin"
      ? ["/portal/orders", "/portal/payments", ...shared]
      : role === "technician"
        ? [
            "/portal/technician-dashboard",
            "/portal/jobs",
            "/portal/orders/",
            ...shared,
          ]
        : [
            "/portal/dashboard",
            "/portal/reviews",
            "/portal/orders/",
            ...shared,
          ];
  const path = request.nextUrl.pathname;
  if (
    role &&
    path.startsWith("/portal") &&
    path !== "/portal" &&
    !allowed.some((prefix) => path.startsWith(prefix))
  ) {
    return NextResponse.redirect(new URL(defaults[role], request.url));
  }
  if (role && (path === "/login" || path === "/portal"))
    return NextResponse.redirect(new URL(defaults[role], request.url));
  return response;
}
