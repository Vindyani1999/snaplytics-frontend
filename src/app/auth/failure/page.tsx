"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthFailurePage() {
  const router = useRouter();

  useEffect(() => {
    // Optionally redirect to login after a delay
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Authentication Failed
        </h1>
        <p className="text-gray-700 mb-4">
          Sorry, we couldn't sign you in with Google. Please try again.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
