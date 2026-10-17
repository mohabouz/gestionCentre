"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type SessionUser = { id: number; name: string; username: string; role: "ADMIN" | "SUPER_ADMIN" };
const AuthContext = createContext<{ user: SessionUser | null; loading: boolean; setSessionUser: (user: SessionUser | null) => void }>({ user: null, loading: true, setSessionUser: () => undefined });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const setSessionUser = useCallback(
    (nextUser: SessionUser | null) =>
      setUser(
        nextUser
          ? {
              ...nextUser,
              role:
                String(nextUser.role).replace(/[-\s]/g, "_").toUpperCase() ===
                "SUPER_ADMIN"
                  ? "SUPER_ADMIN"
                  : "ADMIN",
            }
          : null,
      ),
    [],
  );

  return (
    <AuthContext.Provider value={{ user, loading: false, setSessionUser }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() { return useContext(AuthContext); }
