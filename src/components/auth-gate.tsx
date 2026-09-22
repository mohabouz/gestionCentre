"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = pathname === "/login" || pathname === "/setup";
  const { user, loading, setSessionUser } = useAuth();
  const [ready, setReady] = useState(publicPage);
  useEffect(() => { if (publicPage) { setReady(true); return; } fetch("/api/auth/session", { cache: "no-store" }).then(response => response.json()).then(result => { if (result.needsSetup) router.replace("/setup"); else if (!result.user) router.replace("/login"); else { setSessionUser(result.user); setReady(true); } }).catch(() => router.replace("/login")); }, [pathname, publicPage, router, setSessionUser]);
  if (!ready || loading) return <div className="flex min-h-screen items-center justify-center bg-[#f5f7f6] text-sm font-bold text-[#697b70]">جاري التحقق من الهوية...</div>;
  return <>{children}</>;
}