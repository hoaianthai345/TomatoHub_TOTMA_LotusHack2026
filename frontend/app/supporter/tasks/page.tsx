"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { listVolunteerRegistrations } from "@/lib/api/volunteer-registrations";
import { formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { VolunteerRegistration } from "@/types/volunteer-registration";

export default function TasksPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      isLoading ||
      currentUser?.role !== "supporter" ||
      !currentUser.id ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    const loadTasks = async () => {
      try {
        const [registrationList, campaignList] = await Promise.all([
          listVolunteerRegistrations({
            userId: currentUser.id,
            token: accessToken,
            limit: 200,
          }),
          listPublishedCampaigns(200),
        ]);

        if (!cancelled) {
          setRegistrations(registrationList);
          setCampaigns(campaignList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Failed to load tasks."
          );
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.id, currentUser?.role, isLoading]);

  const campaignTitleById = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign.title])),
    [campaigns]
  );

  const approvedTasks = registrations.filter((item) => item.status === "approved");
  const pendingTasks = registrations.filter((item) => item.status === "pending");
  const rejectedTasks = registrations.filter((item) => item.status === "rejected");

  return (
    <RoleGate role="supporter" loadingMessage="Loading tasks...">
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">My Tasks</h1>
        <p className="mb-6 text-body">Tasks assigned to you within campaigns</p>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Approved</p>
            <p className="mt-1 text-2xl font-semibold text-success">{approvedTasks.length}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-heading">{pendingTasks.length}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Rejected</p>
            <p className="mt-1 text-2xl font-semibold text-danger">{rejectedTasks.length}</p>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        {approvedTasks.length > 0 ? (
          <div className="grid gap-4">
            {approvedTasks.map((task) => (
              <div key={task.id} className="card-base p-5">
                <h3 className="text-lg font-semibold text-heading">
                  {campaignTitleById.get(task.campaignId) ?? task.campaignId}
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Approved on {formatDateTime(task.registeredAt)}
                </p>
                <p className="mt-1 text-sm text-text">
                  {task.message || "No additional message provided."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-container p-6 text-center text-muted">
            <p>No approved tasks assigned yet.</p>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
