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
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount, check if token exists in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    if (savedToken) {
      try {
        const payload = JSON.parse(atob(savedToken.split(".")[1]));
        setUser(payload);
        setToken(savedToken);
      } catch (err) {
        console.error("Invalid token in localStorage", err);
        localStorage.removeItem("auth_token");
      }
    }
    setLoading(false);
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

        // Store token in localStorage
        localStorage.setItem("auth_token", tokenFromUrl);

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
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    router.push("/login");
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
