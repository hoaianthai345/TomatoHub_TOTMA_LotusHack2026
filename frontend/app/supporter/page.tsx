"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getSupporterDashboard } from "@/lib/api/dashboards";
import { ApiError } from "@/lib/api/http";
import { getSupportTypeLabel } from "@/lib/auth/supportTypes";
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
    },
    {
      label: "Total Contributions",
      value: dashboard?.totalContributions ?? 0,
    },
    {
      label: "Tasks Completed",
      value: dashboard?.tasksCompleted ?? 0,
    },
    {
      label: "Support Types",
      value: currentUser?.supportTypes?.length || 0,
    },
    {
      label: "Total Donated",
      value: formatCurrency(dashboard?.totalDonatedAmount ?? 0),
    },
  ];
  const participationCards = dashboard?.participationCards ?? [];
  const contributionItems = dashboard?.contributionItems ?? [];
  const taskItems = dashboard?.taskItems ?? [];

  return (
    <RoleGate role="supporter" loadingMessage="Loading supporter dashboard...">
      <section className="space-y-6">
        <div className="card-base overflow-hidden border border-supporter/15 bg-[linear-gradient(135deg,_rgba(234,88,12,0.12),_rgba(255,255,255,0.98))]">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-supporter">
                Supporter Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-bold text-heading lg:text-4xl">
                Welcome back, {currentUser?.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-text-muted">
                Track your active support commitments, see what happens next, and keep your participation moving without losing context.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {(currentUser?.supportTypes ?? []).map((item) => (
                  <span key={item} className="badge-base badge-supporter">
                    {getSupportTypeLabel(item)}
                  </span>
                ))}
                {currentUser?.location ? (
                  <span className="badge-base border border-border bg-white text-text">
                    {currentUser.location}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/supporter/registrations" className="btn-base bg-supporter text-white">
                  View registrations
                </Link>
                <Link href="/supporter/tasks" className="btn-base btn-secondary">
                  Review tasks
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_40px_rgba(234,88,12,0.08)]">
              <p className="text-sm font-semibold text-heading">Next priority</p>
              <p className="mt-3 text-lg font-bold text-heading">
                {participationCards[0]?.campaignTitle ?? "No campaign joined yet"}
              </p>
              <p className="mt-2 text-sm text-text-muted">
                {participationCards[0]?.nextStep ?? "Once you join a campaign, your next steps will appear here."}
              </p>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="rounded-2xl bg-surface-light p-3">
                  <p className="text-text-muted">Role</p>
                  <p className="mt-1 font-semibold text-heading">
                    {participationCards[0]?.roleLabel ?? "Awaiting assignment"}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-light p-3">
                  <p className="text-text-muted">When</p>
                  <p className="mt-1 font-semibold text-heading">
                    {participationCards[0]?.dateLabel ?? "No schedule yet"}
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="card-hover rounded-3xl border border-border bg-white p-5"
            >
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{stat.label}</h3>
              <p className="mt-3 text-3xl font-bold text-heading">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="card-base p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-heading">Campaigns You Joined</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Live participation pulled from your linked donations and volunteer registrations.
                  </p>
                </div>
                <Link href="/supporter/registrations" className="text-sm font-semibold text-supporter">
                  See all
                </Link>
              </div>

            {participationCards.length > 0 ? (
              <div className="mt-5 grid gap-4">
                {participationCards.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-border bg-white p-4"
                  >
                    <div className="relative aspect-[16/7] w-full overflow-hidden rounded-2xl border border-border bg-surface-light">
                      <Image
                        src={item.coverImage}
                        alt={item.campaignTitle}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 760px"
                      />
                    </div>
                    <div className="mt-4 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge-base badge-supporter">{item.roleLabel}</span>
                        <span className="badge-base border border-border bg-surface-light text-text">
                          {item.statusLabel}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-heading">{item.campaignTitle}</h3>
                      <p className="mt-1 text-sm text-text-muted">{item.campaignLocation}</p>
                      <p className="mt-3 text-sm text-text">{item.nextStep}</p>
                      <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                        {item.dateLabel}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-3xl border border-border bg-surface-light p-5 text-sm text-text-muted">
                Your joined campaigns will appear here after your first donation or volunteer registration.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card-base p-6">
              <h2 className="text-xl font-bold text-heading">Upcoming Tasks</h2>
              {taskItems.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {taskItems.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-border bg-surface-light p-4">
                      <p className="text-sm font-semibold text-heading">{task.title}</p>
                      <p className="mt-1 text-sm text-text-muted">{task.campaignTitle}</p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.16em]">
                        <span className="text-supporter">{task.statusLabel}</span>
                        <span className="text-text-muted">{task.dueLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-muted">
                  Once a volunteer registration is approved or pending, your next tasks will appear here.
                </p>
              )}
            </div>

            <div className="card-base p-6">
              <h2 className="text-xl font-bold text-heading">Live Summary</h2>
              <p className="mt-3 text-sm text-text-muted">
                {isLoading || !dashboard
                  ? "Loading your contribution summary..."
                  : `You currently have ${dashboard.myRegistrations} linked registration(s), and ${dashboard.activeCampaigns} active campaign(s) where your support is already counted.`}
              </p>
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-heading">Contribution Timeline</h2>
              <p className="mt-1 text-sm text-text-muted">
                Recent activity based on the real donation and volunteer records linked to your account.
              </p>
            </div>
            <Link href="/supporter/contributions" className="text-sm font-semibold text-supporter">
              Open contributions
            </Link>
          </div>

          {contributionItems.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {contributionItems.map((item) => (
                <article key={item.id} className="rounded-3xl border border-border bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {item.contributionType}
                  </p>
                  <h3 className="mt-3 text-lg font-bold text-heading">{item.campaignTitle}</h3>
                  <p className="mt-3 text-sm text-text">{item.summary}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-supporter">{item.statusLabel}</span>
                    <span className="text-text-muted">{item.dateLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-border bg-surface-light p-5 text-sm text-text-muted">
              Your recent donation and volunteer activity will appear here once you start supporting campaigns.
            </div>
          )}
        </div>
      </section>
    </RoleGate>
  );
}
