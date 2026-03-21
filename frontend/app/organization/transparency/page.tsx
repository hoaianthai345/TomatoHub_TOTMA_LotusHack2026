"use client";

import { useEffect, useState } from "react";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import TransparencySummary from "@/components/transparency/transparency-summary";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listTransparencyLogs } from "@/lib/api/transparency";
import { ApiError } from "@/lib/api/http";
import type { TransparencyLog } from "@/types/transparency";

export default function TransparencyPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [logs, setLogs] = useState<TransparencyLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const organizationId = currentUser?.organizationId;
    if (isLoading || currentUser?.role !== "organization" || !organizationId) {
      return;
    }

    let cancelled = false;

    const loadLogs = async () => {
      try {
        const response = await listTransparencyLogs({
          organizationId,
          token: accessToken ?? undefined,
        });
        if (!cancelled) {
          setLogs(response);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load transparency logs."
          );
        }
      }
    };

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.organizationId, currentUser?.role, isLoading]);

  return (
    <RoleGate role="organization" loadingMessage="Loading transparency data...">
      <div className="py-10">
        <Container>
          <SectionTitle
            title="Transparency Page"
            description="Transparency should be visible in the workflow, not handled outside the system."
          />

          {errorMessage ? (
            <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <TransparencySummary logs={logs} />
        </Container>
      </div>
    </RoleGate>
  );
}
