"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import OrgStatCard from "@/components/organization/org-stat-card";
import { useAuth } from "@/lib/auth";
import { getOrganizationDashboard } from "@/lib/api/dashboards";
import { ApiError } from "@/lib/api/http";
import { formatCurrency } from "@/utils/format";
import type { OrganizationDashboard } from "@/types/dashboard";
import RoleGate from "@/components/auth/RoleGate";

export default function OrganizationDashboardPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [dashboard, setDashboard] = useState<OrganizationDashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const organizationId = currentUser?.organizationId;
    if (isLoading || currentUser?.role !== "organization" || !organizationId) {
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await getOrganizationDashboard(
          organizationId,
          accessToken ?? undefined
        );
        if (!cancelled) {
          setDashboard(response);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load organization dashboard."
          );
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.organizationId, currentUser?.role, isLoading]);

  const stats = [
    { label: "Campaigns", value: dashboard?.campaigns ?? 0 },
    { label: "Beneficiaries", value: dashboard?.beneficiaries ?? 0 },
    { label: "Supporters", value: dashboard?.supporters ?? 0 },
    { label: "Donations", value: dashboard?.donations ?? 0 },
    {
      label: "Total Raised",
      value: formatCurrency(dashboard?.totalRaised ?? 0),
    },
  ];

  return (
    <RoleGate role="organization" loadingMessage="Loading organization dashboard...">
      <div className="py-10">
        <Container>
          <SectionTitle
            title={`${currentUser?.organizationName ?? currentUser?.name} Dashboard`}
            description="Main management entry for campaigns, beneficiaries, supporters, donations, and transparency."
          />

          {errorMessage ? (
            <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <OrgStatCard key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </div>

          <div className="mt-8 card-base p-6">
            <h3 className="text-lg font-semibold text-heading">Quick actions</h3>
            <p className="mt-2 text-sm text-text-muted">
              {isLoading || !dashboard
                ? "Loading live organization metrics from the backend..."
                : "Dashboard cards now reflect real backend data instead of frontend mocks."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/organization/campaigns/create"
                className="btn-base btn-primary"
              >
                Create campaign
              </Link>
              <Link
                href="/organization/beneficiaries"
                className="btn-base btn-secondary"
              >
                Manage beneficiaries
              </Link>
              <Link
                href="/organization/transparency"
                className="btn-base btn-secondary"
              >
                Publish transparency
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </RoleGate>
  );
}
