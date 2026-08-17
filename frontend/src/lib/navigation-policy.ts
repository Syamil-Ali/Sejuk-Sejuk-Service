import type { Role } from "@/lib/domain";

export const roleDefaults = {
  admin: "/portal/orders",
  technician: "/portal/technician-dashboard",
  manager: "/portal/dashboard",
} as const;

const sharedPages = [
  "/portal/messages",
  "/portal/assistant",
  "/portal/notifications",
  "/portal/about",
];

export function roleAllowedPaths(role: Role): string[] {
  switch (role) {
    case "admin":
      return ["/portal/orders", "/portal/payments", ...sharedPages];
    case "technician":
      return [
        "/portal/technician-dashboard",
        "/portal/jobs",
        "/portal/orders/",
        ...sharedPages,
      ];
    case "manager":
      return [
        "/portal/dashboard",
        "/portal/reviews",
        "/portal/orders/",
        ...sharedPages,
      ];
  }
}

export function portalHomeFor(role: Role): string {
  return roleDefaults[role];
}

/** True when the role should be redirected away from the given path. */
export function shouldRedirectRole(role: Role, pathname: string): boolean {
  if (pathname === "/login" || pathname === "/portal") return true;
  if (!pathname.startsWith("/portal")) return false;
  return !roleAllowedPaths(role).some((prefix) => pathname.startsWith(prefix));
}
