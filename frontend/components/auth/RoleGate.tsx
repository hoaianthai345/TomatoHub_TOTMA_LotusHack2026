"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { UserRole } from "@/types/user";

interface RoleGateProps {
  role: Exclude<UserRole, "guest">;
  children: React.ReactNode;
  loadingMessage?: string;
}

export default function RoleGate({
  role,
  children,
  loadingMessage = "Loading your account...",
}: RoleGateProps) {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    if (currentUser.role !== role) {
      router.replace(currentUser.role === "organization" ? "/organization" : "/supporter");
    }
  }, [currentUser, isLoading, role, router]);

  if (isLoading || !currentUser || currentUser.role !== role) {
    return (
      <div className="p-6">
        <div className="card-base p-6 text-sm text-text-muted">
          {loadingMessage}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
