"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getSupporterDashboard } from "@/lib/api/dashboards";
import { ApiError } from "@/lib/api/http";
import { formatCurrency } from "@/utils/format";
import type { SupporterDashboard } from "@/types/dashboard";
import RoleGate from "@/components/auth/RoleGate";

export default function SupporterDashboardPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [dashboard, setDashboard] = useState<SupporterDashboard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || currentUser?.role !== "supporter" || !currentUser.id) {
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await getSupporterDashboard(
          currentUser.id,
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
              : "Failed to load supporter dashboard."
          );
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.id, currentUser?.role, isLoading]);

  const statCards = [
    {
      label: "Active Campaigns",
      value: dashboard?.activeCampaigns ?? 0,
      color: "--color-primary",
    },
    {
      label: "Total Contributions",
      value: dashboard?.totalContributions ?? 0,
      color: "--color-info",
    },
    {
      label: "Tasks Completed",
      value: dashboard?.tasksCompleted ?? 0,
      color: "--color-success",
    },
    {
      label: "Support Types",
      value: currentUser?.supportTypes?.length || 0,
      color: "--color-supporter",
    },
    {
      label: "Total Donated",
      value: formatCurrency(dashboard?.totalDonatedAmount ?? 0),
      color: "--color-org",
    },
  ];

  return (
    <RoleGate role="supporter" loadingMessage="Loading supporter dashboard...">
      <div className="p-6">
        <h1 className="mb-1 text-3xl font-bold">Welcome, {currentUser?.name}!</h1>
        <p className="mb-6 text-body">Your supporter dashboard</p>

        {errorMessage ? (
          <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border p-6 card-hover"
              style={{
                backgroundColor: `color-mix(in oklab, var(${stat.color}) 8%, white)`,
                borderColor: `var(${stat.color})`,
              }}
            >
              <h3 className="mb-2 text-sm font-medium text-body">{stat.label}</h3>
              <p
                className="text-3xl font-bold"
                style={{ color: `var(${stat.color})` }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Recent Activity</h2>
          <div className="card-container p-6 text-center text-muted">
            <p>
              {isLoading || !dashboard
                ? "Loading your contribution summary..."
                : `You currently have ${dashboard.myRegistrations} registration(s) linked to your account.`}
            </p>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
