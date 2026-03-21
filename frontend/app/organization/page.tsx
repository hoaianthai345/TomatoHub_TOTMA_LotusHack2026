"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getOrganizationDashboard } from "@/lib/api/dashboards";
import { ApiError } from "@/lib/api/http";
import {
  getOrganizationCampaignSnapshots,
  getOrganizationRecentActivities,
} from "@/mocks/dashboard-experience";
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
  const campaignSnapshots = getOrganizationCampaignSnapshots(currentUser?.organizationId);
  const recentActivities = getOrganizationRecentActivities(currentUser?.organizationId);

  return (
    <RoleGate role="organization" loadingMessage="Loading organization dashboard...">
      <section className="space-y-6">
        <div className="card-base overflow-hidden border border-org/15 bg-[linear-gradient(135deg,_rgba(124,58,237,0.12),_rgba(255,255,255,0.98))]">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_340px] lg:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-org)]">
                Organization Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-bold text-heading lg:text-4xl">
                {currentUser?.organizationName ?? currentUser?.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-text-muted">
                Main control room for campaign delivery, supporter momentum, and transparency reporting.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/organization/campaigns/create" className="btn-base bg-org text-white">
                  Create campaign
                </Link>
                <Link href="/organization/supporters" className="btn-base btn-secondary">
                  View supporters
                </Link>
                <Link href="/organization/transparency" className="btn-base btn-secondary">
                  Transparency
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-[0_18px_40px_rgba(124,58,237,0.08)]">
              <p className="text-sm font-semibold text-heading">Operational pulse</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-surface-light p-4">
                  <p className="text-sm text-text-muted">Live campaigns in motion</p>
                  <p className="mt-1 text-2xl font-bold text-heading">{dashboard?.campaigns ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-surface-light p-4">
                  <p className="text-sm text-text-muted">Supporter network</p>
                  <p className="mt-1 text-2xl font-bold text-heading">{dashboard?.supporters ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-surface-light p-4">
                  <p className="text-sm text-text-muted">Raised so far</p>
                  <p className="mt-1 text-2xl font-bold text-heading">
                    {formatCurrency(dashboard?.totalRaised ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="card-hover rounded-3xl border border-org/10 bg-white p-5 shadow-[0_12px_30px_rgba(17,24,39,0.05)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-bold text-heading">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="card-base p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-heading">Campaign Pipeline</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Frontend sample cards to continue building the organization operations view.
                </p>
              </div>
              <Link href="/organization/campaigns" className="text-sm font-semibold text-[color:var(--color-org)]">
                Manage campaigns
              </Link>
            </div>

            <div className="mt-5 grid gap-4">
              {campaignSnapshots.map((item) => (
                <article key={item.id} className="rounded-3xl border border-border bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-base badge-org">{item.statusLabel}</span>
                    <span className="badge-base border border-border bg-surface-light text-text">
                      {item.location}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-heading">{item.campaignTitle}</h3>
                  <p className="mt-2 text-sm text-text-muted">{item.supportLabel}</p>
                  <div className="mt-4 h-2 rounded-full bg-surface-light">
                    <div
                      className="h-2 rounded-full bg-org"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[color:var(--color-org)]">
                      {item.progressPercent}% to fundraising target
                    </span>
                    <span className="text-text-muted">{item.note}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card-base p-6">
              <h2 className="text-xl font-bold text-heading">Recent Team Activity</h2>
              <div className="mt-4 space-y-4">
                {recentActivities.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-surface-light p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-heading">{item.title}</p>
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                        {item.timeLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text">{item.detail}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-org)]">
                      {item.actor}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-base p-6">
              <h2 className="text-xl font-bold text-heading">Workspace Note</h2>
              <p className="mt-3 text-sm text-text-muted">
                {isLoading || !dashboard
                  ? "Loading live organization metrics from the backend..."
                  : "The headline metrics come from backend APIs, while the campaign pipeline and recent activity cards use sample frontend data until dedicated detail endpoints are wired."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </RoleGate>
  );
}
