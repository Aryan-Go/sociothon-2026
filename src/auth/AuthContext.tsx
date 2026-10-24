import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ENV } from "../lib/env";
import type { Role } from "../types";

const AUTH_KEY = "loopr:auth:v1";

export interface AuthSession {
  role: Role;
  name: string;
  email: string;
  collectorId?: string;
  signedInAt: string;
}

interface SignInResult {
  ok: boolean;
  error?: string;
  session?: AuthSession;
}

interface AuthValue {
  session: AuthSession | null;
  ready: boolean;
  signIn: (role: Role, email: string, password: string) => SignInResult;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      !parsed ||
      !["user", "admin", "collector"].includes(String(parsed.role)) ||
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string"
    ) {
      return null;
    }
    return {
      role: parsed.role as Role,
      email: parsed.email,
      name: parsed.name,
      collectorId: parsed.collectorId,
      signedInAt: parsed.signedInAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  const signIn = useCallback((role: Role, email: string, password: string): SignInResult => {
    const normalized = email.trim().toLowerCase();
    const expected =
      role === "admin"
        ? ENV.auth.admin
        : role === "collector"
          ? ENV.auth.collector
          : ENV.auth.member;

    if (!normalized || !password) {
      return { ok: false, error: "Enter both your email and password." };
    }

    if (normalized !== expected.email.toLowerCase() || password !== expected.password) {
      return {
        ok: false,
        error:
          role === "user"
            ? "Those member details do not match this workspace."
            : `Those ${role} credentials do not match the values configured in .env.`,
      };
    }

    const next: AuthSession = {
      role,
      email: expected.email,
      name: expected.name,
      collectorId: role === "collector" ? ENV.auth.collector.collectorId : undefined,
      signedInAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    } catch {
      // The session still works in memory if storage is blocked.
    }
    setSession(next);
    return { ok: true, session: next };
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(AUTH_KEY);
    } catch {
      // Ignore storage failures.
    }
    setSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session, ready: true, signIn, signOut }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
