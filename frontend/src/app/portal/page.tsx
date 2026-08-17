"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo-provider";

export default function PortalHome() {
  const { user } = useDemo();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    router.replace(
      user.role === "admin"
        ? "/portal/orders"
        : user.role === "technician"
          ? "/portal/technician-dashboard"
          : "/portal/dashboard",
    );
  }, [user, router]);
  return <p className="text-sm text-body">Opening your workspace…</p>;
}
