"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get token and user data from URL parameters
    const token = searchParams?.get("token");
    const userParam = searchParams?.get("user");
    const email = searchParams?.get("email");
    const name = searchParams?.get("name");
    const picture = searchParams?.get("picture");
    const id = searchParams?.get("id");

    if (token) {
      // Store token
      localStorage.setItem("auth_token", token);

      // Store user data - try to get from 'user' param first, otherwise construct from individual params
      let userData;
      if (userParam) {
        try {
          userData = JSON.parse(decodeURIComponent(userParam));
        } catch (error) {
          console.error("Error parsing user param:", error);
        }
      }

      // If no user param or parsing failed, construct from individual params
      if (!userData && (email || name || id)) {
        userData = {
          id: id || email || "",
          email: email || "",
          name: name || "",
          picture: picture || "",
        };
      }

      if (userData) {
        localStorage.setItem("user_data", JSON.stringify(userData));
      }

      // Redirect to home page
      router.push("/");
    } else {
      // No token found, redirect to login
      console.error("No token found in auth success callback");
      router.push("/login");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 mb-4">
          Authentication successful! Redirecting...
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
