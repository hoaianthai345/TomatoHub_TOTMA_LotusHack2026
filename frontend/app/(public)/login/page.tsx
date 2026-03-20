"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  const handleQuickLogin = async (userId: string) => {
    try {
      await login(userId);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="card-base p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-heading">
          Welcome back
        </h1>
        <p className="text-center text-body mb-8">
          Sign in to continue to your dashboard
        </p>

        {/* Mock Login Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleQuickLogin("sup-1")}
            disabled={isLoading}
            className="btn-base w-full btn-primary disabled:opacity-50 justify-center"
          >
            {isLoading ? "Logging in..." : "Login as Supporter (Mai Giang)"}
          </button>
          <button
            onClick={() => handleQuickLogin("org-1")}
            disabled={isLoading}
            className="btn-base w-full btn-primary disabled:opacity-50 justify-center"
          >
            {isLoading ? "Logging in..." : "Login as Organization"}
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-main"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-page text-muted">
              Don&apos;t have account?
            </span>
          </div>
        </div>

        <Link
          href="/signup"
          className="btn-base w-full btn-secondary justify-center"
        >
          Create new account
        </Link>
      </div>
    </div>
  );
}
