"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
  importToken?: (t: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const expiryTimer = useRef<number | null>(null);

  const clearExpiryTimer = () => {
    if (expiryTimer.current) {
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  };

  const scheduleTokenExpiry = (t: string | null) => {
    clearExpiryTimer();
    if (!t) return;
    try {
      const parts = t.split(".");
      if (parts.length < 2) return;
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload?.exp;
      if (!exp) return;
      const expiresAt = Number(exp) * 1000;
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        // already expired
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
        router.push("/login");
        return;
      }
      // schedule logout when token expires
      expiryTimer.current = window.setTimeout(() => {
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
        router.push("/login");
      }, ms) as unknown as number;
    } catch (err) {
      // ignore schedule errors
      console.warn("Failed to schedule token expiry", err);
    }
  };

  // On mount, check if token exists in localStorage
  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      try {
        setLoading(true);
        const AUTH_URL =
          process.env.NEXT_PUBLIC_AUTH_URL ||
          "https://snaplytics-auth-backend.vercel.app";

        // First try cookie-based verify (the backend should check cookie when credentials included)
        const res = await fetch(`${AUTH_URL}/auth/verify`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.valid && mounted) {
            setUser(json.user ?? null);
            setToken(null); // cookie-based session
            setLoading(false);
            return;
          }
        }

        // Fallback: check localStorage token and try to verify using Authorization header
        const savedToken =
          typeof window !== "undefined"
            ? localStorage.getItem("auth_token")
            : null;
        if (savedToken) {
          try {
            const vres = await authFetch(`${AUTH_URL}/auth/verify`, {
              method: "GET",
            });
            if (vres.ok) {
              const vjson = await vres.json();
              if (vjson?.valid && mounted) {
                setUser(vjson.user ?? null);
                setToken(savedToken);
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            console.warn("Token verify failed", err);
            // invalid token, remove it
            localStorage.removeItem("auth_token");
          }
        }

        if (mounted) setLoading(false);
      } catch (err) {
        console.error("Auth verify error", err);
        if (mounted) setLoading(false);
      }
    }

    verifySession();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle OAuth callback with token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      try {
        // Decode token to get user info
        const payload = JSON.parse(atob(tokenFromUrl.split(".")[1]));
        setUser(payload);
        setToken(tokenFromUrl);

        // Store token in localStorage so subsequent calls can use it
        try {
          localStorage.setItem("auth_token", tokenFromUrl);
        } catch (err) {
          console.warn("Unable to persist token in localStorage", err);
        }

        // Clean URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        router.push("/"); // redirect to home or dashboard
      } catch (err) {
        console.error("Error processing OAuth token:", err);
      }
    }
  }, [router]);

  const login = () => {
    const authUrl =
      process.env.NEXT_PUBLIC_AUTH_URL ||
      "https://snaplytics-auth-backend.vercel.app";
    window.location.href = `${authUrl}/auth/google`;
  };

  const logout = () => {
    // Clear token and user state
    (async () => {
      try {
        const AUTH_URL =
          process.env.NEXT_PUBLIC_AUTH_URL ||
          "https://snaplytics-auth-backend.vercel.app";
        await fetch(`${AUTH_URL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch (err) {
        // ignore
      }
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
      router.push("/login");
    })();
  };

  // Dev helper: import a token string into localStorage (useful for testing)
  const importToken = (t: string) => {
    try {
      localStorage.setItem("auth_token", t);
      setToken(t);
      try {
        const payload = JSON.parse(atob(t.split(".")[1]));
        setUser(payload);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("Failed to import token", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        importToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
