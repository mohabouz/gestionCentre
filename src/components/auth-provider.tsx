"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SessionUser = { id: number; name: string; username: string; role: "ADMIN" | "SUPER_ADMIN" };
const AuthContext = createContext<{ user: SessionUser | null; loading: boolean; setSessionUser: (user: SessionUser | null) => void }>({ user: null, loading: true, setSessionUser: () => undefined });
export function AuthProvider({ children }: { children: React.ReactNode }) { const [user, setUser] = useState<SessionUser | null>(null); const [loading, setLoading] = useState(true); const setSessionUser = useCallback((nextUser: SessionUser | null) => setUser(nextUser ? { ...nextUser, role: String(nextUser.role).replace(/[-\s]/g, "_").toUpperCase() === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN" } : null), []); useEffect(() => { fetch("/api/auth/session", { cache: "no-store" }).then(response => response.json()).then(result => { setSessionUser(result.user || null); setLoading(false); }).catch(() => setLoading(false)); }, [setSessionUser]); return <AuthContext.Provider value={{ user, loading, setSessionUser }}>{children}</AuthContext.Provider>; }
export function useAuth() { return useContext(AuthContext); }
