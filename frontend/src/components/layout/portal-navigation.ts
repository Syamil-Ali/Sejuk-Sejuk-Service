import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bot,
  ClipboardList,
  CircleDollarSign,
  Gauge,
  Info,
  MessageSquare,
  Wrench,
} from "lucide-react";
import type { Role } from "@/lib/domain";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "notifications" | "messages";
};

export type PortalNavSection = {
  label: string;
  links: PortalNavItem[];
};

const communicationLinks: PortalNavItem[] = [
  {
    href: "/portal/messages",
    label: "Messages",
    icon: MessageSquare,
    badge: "messages",
  },
  { href: "/portal/assistant", label: "Ops assistant", icon: Bot },
  {
    href: "/portal/notifications",
    label: "Notifications",
    icon: Bell,
    badge: "notifications",
  },
];

const helpLink: PortalNavItem = {
  href: "/portal/about",
  label: "How it works",
  icon: Info,
};

export const portalNavigation: Record<Role, PortalNavSection[]> = {
  admin: [
    {
      label: "Operations",
      links: [
        { href: "/portal/orders", label: "Orders", icon: ClipboardList },
        { href: "/portal/payments", label: "Payments", icon: CircleDollarSign },
      ],
    },
    { label: "Communication", links: communicationLinks },
    { label: "Help", links: [helpLink] },
  ],
  technician: [
    {
      label: "Field work",
      links: [
        {
          href: "/portal/technician-dashboard",
          label: "Dashboard",
          icon: Gauge,
        },
        { href: "/portal/jobs", label: "My jobs", icon: Wrench },
      ],
    },
    { label: "Communication", links: communicationLinks },
    { label: "Help", links: [helpLink] },
  ],
  manager: [
    {
      label: "Management",
      links: [
        { href: "/portal/dashboard", label: "Dashboard", icon: Gauge },
        { href: "/portal/reviews", label: "Reviews", icon: ClipboardList },
      ],
    },
    { label: "Communication", links: communicationLinks },
    { label: "Help", links: [helpLink] },
  ],
};

export function navigationLinks(role: Role) {
  return portalNavigation[role].flatMap((section) => section.links);
}
