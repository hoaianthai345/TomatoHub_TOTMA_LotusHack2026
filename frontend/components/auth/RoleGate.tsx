"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, TextSkeleton } from "@/components/loading";
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
        <div className="card-base p-6">
          <p className="sr-only" aria-live="polite">
            {loadingMessage}
          </p>
          <TextSkeleton lines={2} lineClassName="h-4 w-full rounded" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
