"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    // Verify session by calling backend verify endpoint which checks the HTTP-only cookie
    async function verify() {
      setLoading(true);
      try {
        const res = await fetch(
          `${
            process.env.NEXT_PUBLIC_AUTH_URL ||
            "https://snaplytics-auth-backend.vercel.app"
          }/auth/verify`,
          { credentials: "include" }
        );
        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          if (data.valid && data.user) {
            setUser(data.user as User);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth verify failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");

    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user_data", JSON.stringify(userData));
        setUser(userData);

        // Clean up URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        router.push("/");
      } catch (error) {
        console.error("Error processing auth callback:", error);
      }
    }
  }, [router]);

  const login = () => {
    const authUrl =
      process.env.NEXT_PUBLIC_AUTH_URL ||
      "https://snaplytics-auth-backend.vercel.app/";
    // Ensure authUrl ends with /
    const baseUrl = authUrl.endsWith("/") ? authUrl : `${authUrl}/`;

    // Try direct redirect - backend should handle OAuth flow
    window.location.href = `${baseUrl}auth/google`;
  };

  const logout = () => {
    // Call backend logout to clear cookie
    fetch(
      `${
        process.env.NEXT_PUBLIC_AUTH_URL ||
        "https://snaplytics-auth-backend.vercel.app"
      }/auth/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    ).finally(() => {
      // Clear client-side user state
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      } catch {}
      setUser(null);
      router.push("/login");
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
