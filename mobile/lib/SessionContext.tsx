import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loadSession, saveSession, clearSession, type StoredSession } from "./session";

type Ctx = {
  session: StoredSession | null;
  loading: boolean;
  signIn: (patientId: string, firstName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession()
      .then((s) => setSession(s))
      // If the on-device store itself fails to read (rare, but possible on some Android
      // keystore states), fall back to "no session" rather than leaving `loading` true
      // forever — that would strand the app on its loading screen with no way out.
      .catch((err) => console.error("Failed to load session:", err))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (patientId: string, firstName: string) => {
    await saveSession(patientId, firstName);
    setSession({ patientId, firstName });
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  return <SessionCtx.Provider value={{ session, loading, signIn, signOut }}>{children}</SessionCtx.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
