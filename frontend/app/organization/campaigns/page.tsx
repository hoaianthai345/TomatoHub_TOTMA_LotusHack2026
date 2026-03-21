"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import {
  closeCampaign,
  deleteCampaign,
  listCampaignsByOrganization,
  publishCampaign,
  reopenCampaign,
  updateCampaign,
} from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import {
  listVolunteerRegistrations,
  updateVolunteerRegistrationStatus,
} from "@/lib/api/volunteer-registrations";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type {
  VolunteerRegistration,
  VolunteerRegistrationStatus,
} from "@/types/volunteer-registration";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface-muted text-text-muted border-border",
  published: "bg-success/10 text-success border-success/30",
  closed: "bg-danger/10 text-danger border-danger/30",
};

export default function CampaignsPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
  const [loadingRegistrationId, setLoadingRegistrationId] = useState<string | null>(
    null
  );
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    shortDescription: "",
    description: "",
    goalAmount: "",
  });

  useEffect(() => {
    const organizationId = currentUser?.organizationId;
    if (isLoading || currentUser?.role !== "organization" || !organizationId) {
      return;
    }

    let cancelled = false;

    const loadCampaigns = async () => {
      try {
        const [response, registrationList] = await Promise.all([
          listCampaignsByOrganization(organizationId, {
            limit: 200,
            token: accessToken ?? undefined,
          }),
          accessToken
            ? listVolunteerRegistrations({
                organizationId,
                token: accessToken,
                limit: 500,
              })
            : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setCampaigns(response);
          setRegistrations(registrationList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Failed to load campaigns."
          );
        }
      }
    };

    loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.organizationId, currentUser?.role, isLoading]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const createdCampaignId = query.get("created");
    if (!createdCampaignId) {
      return;
    }

    const createdCampaign = campaigns.find((campaign) => campaign.id === createdCampaignId);
    setSuccessMessage(
      createdCampaign
        ? `Draft "${createdCampaign.title}" was created successfully.`
        : "Draft campaign created successfully."
    );
  }, [campaigns]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const updatedCampaignId = query.get("updated");
    if (!updatedCampaignId) {
      return;
    }

    const updatedCampaign = campaigns.find((campaign) => campaign.id === updatedCampaignId);
    setSuccessMessage(
      updatedCampaign
        ? `Campaign "${updatedCampaign.title}" was updated successfully.`
        : "Campaign updated successfully."
    );
  }, [campaigns]);

  const registrationStatsByCampaign = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        cancelled: number;
      }
    >();

    registrations.forEach((registration) => {
      const current = map.get(registration.campaignId) ?? {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        cancelled: 0,
      };
      current.total += 1;
      if (registration.status === "approved") current.approved += 1;
      if (registration.status === "pending") current.pending += 1;
      if (registration.status === "rejected") current.rejected += 1;
      if (registration.status === "cancelled") current.cancelled += 1;
      map.set(registration.campaignId, current);
    });

    return map;
  }, [registrations]);

  const volunteerOverview = useMemo(
    () =>
      registrations.reduce(
        (acc, registration) => {
          acc.total += 1;
          if (registration.status === "approved") acc.approved += 1;
          if (registration.status === "pending") acc.pending += 1;
          if (registration.status === "rejected") acc.rejected += 1;
          if (registration.status === "cancelled") acc.cancelled += 1;
          return acc;
        },
        { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }
      ),
    [registrations]
  );

  const registrationsByCampaign = useMemo(() => {
    const map = new Map<string, VolunteerRegistration[]>();
    registrations.forEach((registration) => {
      const current = map.get(registration.campaignId) ?? [];
      current.push(registration);
      map.set(registration.campaignId, current);
    });
    map.forEach((list, key) => {
      map.set(
        key,
        [...list].sort(
          (a, b) =>
            new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
        )
      );
    });
    return map;
  }, [registrations]);

  const startEdit = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setEditForm({
      title: campaign.title,
      shortDescription: campaign.shortDescription || "",
      description: campaign.description || "",
      goalAmount: String(campaign.goalAmount ?? campaign.targetAmount ?? 0),
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const cancelEdit = () => {
    setEditingCampaignId(null);
    setEditForm({
      title: "",
      shortDescription: "",
      description: "",
      goalAmount: "",
    });
  };

  const handleSaveEdit = async (campaignId: string) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    const title = editForm.title.trim();
    if (!title) {
      setErrorMessage("Title is required.");
      return;
    }

    const parsedGoal = Number(editForm.goalAmount);
    if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      setErrorMessage("Goal amount must be greater than 0.");
      return;
    }

    setLoadingCampaignId(campaignId);
    try {
      const updated = await updateCampaign(
        campaignId,
        {
          title,
          shortDescription: editForm.shortDescription.trim() || undefined,
          description: editForm.description.trim() || undefined,
          goalAmount: parsedGoal,
        },
        accessToken
      );
      setCampaigns((prev) =>
        prev.map((campaign) => (campaign.id === campaignId ? updated : campaign))
      );
      setSuccessMessage("Campaign updated successfully.");
      setErrorMessage(null);
      cancelEdit();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to update campaign."
      );
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Delete campaign "${campaign.title}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setLoadingCampaignId(campaign.id);
    try {
      await deleteCampaign(campaign.id, accessToken);
      setCampaigns((prev) => prev.filter((item) => item.id !== campaign.id));
      setSuccessMessage("Campaign deleted successfully.");
      setErrorMessage(null);
      if (editingCampaignId === campaign.id) {
        cancelEdit();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to delete campaign."
      );
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handlePublish = async (campaign: Campaign) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    setLoadingCampaignId(campaign.id);
    try {
      const publishedCampaign = await publishCampaign(campaign.id, accessToken);
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? publishedCampaign : item))
      );
      setSuccessMessage(`Campaign "${publishedCampaign.title}" is now published.`);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to publish campaign."
      );
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleClose = async (campaign: Campaign) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Close campaign "${campaign.title}"? It will stop accepting new donations and registrations.`
    );
    if (!confirmed) {
      return;
    }

    setLoadingCampaignId(campaign.id);
    try {
      const closedCampaign = await closeCampaign(campaign.id, accessToken);
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? closedCampaign : item))
      );
      setSuccessMessage(`Campaign "${closedCampaign.title}" has been closed.`);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to close campaign."
      );
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleReopen = async (campaign: Campaign) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    setLoadingCampaignId(campaign.id);
    try {
      const reopenedCampaign = await reopenCampaign(campaign.id, accessToken);
      setCampaigns((prev) =>
        prev.map((item) => (item.id === campaign.id ? reopenedCampaign : item))
      );
      setSuccessMessage(
        `Campaign "${reopenedCampaign.title}" reopened as draft.`
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to reopen campaign."
      );
    } finally {
      setLoadingCampaignId(null);
    }
  };

  const handleUpdateRegistrationStatus = async (
    registration: VolunteerRegistration,
    status: VolunteerRegistrationStatus
  ) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    if (registration.status === status) {
      return;
    }

    setLoadingRegistrationId(registration.id);
    try {
      const updated = await updateVolunteerRegistrationStatus(
        {
          registrationId: registration.id,
          status,
        },
        accessToken
      );
      setRegistrations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setSuccessMessage(
        `Volunteer "${updated.fullName}" updated to ${updated.status}.`
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Failed to update volunteer registration."
      );
    } finally {
      setLoadingRegistrationId(null);
    }
  };

  return (
    <RoleGate role="organization" loadingMessage="Loading campaigns...">
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold">Campaigns</h1>
            <p className="text-body">
              Manage campaign publishing and monitor volunteer participation.
            </p>
          </div>
          <Link href="/organization/campaigns/create" className="btn-base btn-primary">
            Create campaign
          </Link>
        </div>

        {errorMessage ? (
          <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mb-6 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
            {successMessage}
          </p>
        ) : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Volunteer registrations
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{volunteerOverview.total}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Pending review
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{volunteerOverview.pending}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Approved
            </p>
            <p className="mt-2 text-2xl font-bold text-success">{volunteerOverview.approved}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Rejected
            </p>
            <p className="mt-2 text-2xl font-bold text-danger">{volunteerOverview.rejected}</p>
          </div>
        </div>

        {campaigns.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="card-base p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-semibold text-heading">{campaign.title}</h3>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                      STATUS_STYLE[campaign.status] ?? "bg-surface-muted text-text-muted border-border"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-text-muted line-clamp-2">
                  {campaign.shortDescription || campaign.description}
                </p>

                <div className="mt-4 grid gap-2 text-sm text-text">
                  <p>
                    Raised:{" "}
                    <span className="font-semibold text-primary">
                      {formatCurrency(campaign.raisedAmount)}
                    </span>{" "}
                    / {formatCurrency(campaign.goalAmount ?? campaign.targetAmount)}
                  </p>
                  <p>Location: {campaign.location || "Not specified"}</p>
                  <p>Created: {formatDateTime(campaign.createdAt)}</p>
                  <p>
                    Volunteers:{" "}
                    <span className="font-semibold text-heading">
                      {registrationStatsByCampaign.get(campaign.id)?.total ?? 0}
                    </span>{" "}
                    (approved {registrationStatsByCampaign.get(campaign.id)?.approved ?? 0}, pending{" "}
                    {registrationStatsByCampaign.get(campaign.id)?.pending ?? 0}, rejected{" "}
                    {registrationStatsByCampaign.get(campaign.id)?.rejected ?? 0}, cancelled{" "}
                    {registrationStatsByCampaign.get(campaign.id)?.cancelled ?? 0})
                  </p>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-surface-muted/30 p-4">
                  <p className="text-sm font-semibold text-heading">
                    Volunteer review
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Approve or reject registrations directly from this campaign.
                  </p>

                  {((registrationsByCampaign.get(campaign.id) ?? []).length > 0) ? (
                    <div className="mt-3 space-y-3">
                      {(registrationsByCampaign.get(campaign.id) ?? [])
                        .slice(0, 5)
                        .map((registration) => (
                          <div
                            key={registration.id}
                            className="rounded-md border border-border bg-white p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-heading">
                                  {registration.fullName}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {registration.email} ·{" "}
                                  {formatDateTime(registration.registeredAt)}
                                </p>
                                {registration.message ? (
                                  <p className="mt-1 text-xs text-text">
                                    {registration.message}
                                  </p>
                                ) : null}
                              </div>
                              <span className="rounded-full border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-muted">
                                {registration.status}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {registration.status !== "approved" ? (
                                <button
                                  type="button"
                                  className="btn-base btn-primary text-xs"
                                  disabled={loadingRegistrationId === registration.id}
                                  onClick={() =>
                                    handleUpdateRegistrationStatus(
                                      registration,
                                      "approved"
                                    )
                                  }
                                >
                                  {loadingRegistrationId === registration.id
                                    ? "Saving..."
                                    : "Approve"}
                                </button>
                              ) : null}
                              {registration.status !== "rejected" ? (
                                <button
                                  type="button"
                                  className="btn-base text-xs text-white bg-danger rounded-lg"
                                  disabled={loadingRegistrationId === registration.id}
                                  onClick={() =>
                                    handleUpdateRegistrationStatus(
                                      registration,
                                      "rejected"
                                    )
                                  }
                                >
                                  {loadingRegistrationId === registration.id
                                    ? "Saving..."
                                    : "Reject"}
                                </button>
                              ) : null}
                              {registration.status !== "pending" ? (
                                <button
                                  type="button"
                                  className="btn-base btn-secondary text-xs"
                                  disabled={loadingRegistrationId === registration.id}
                                  onClick={() =>
                                    handleUpdateRegistrationStatus(
                                      registration,
                                      "pending"
                                    )
                                  }
                                >
                                  {loadingRegistrationId === registration.id
                                    ? "Saving..."
                                    : "Set pending"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-text-muted">
                      No volunteer registrations yet for this campaign.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/organization/campaigns/${campaign.id}/edit`}
                    className="btn-base btn-secondary text-sm whitespace-nowrap"
                  >
                    Edit details
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEdit(campaign)}
                    className="btn-base btn-secondary text-sm whitespace-nowrap"
                    disabled={loadingCampaignId === campaign.id}
                  >
                    Quick edit
                  </button>
                  {campaign.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => handlePublish(campaign)}
                      className="btn-base btn-primary text-sm whitespace-nowrap"
                      disabled={loadingCampaignId === campaign.id}
                    >
                      {loadingCampaignId === campaign.id ? "Publishing..." : "Publish"}
                    </button>
                  ) : null}
                  {campaign.status === "published" ? (
                    <button
                      type="button"
                      onClick={() => handleClose(campaign)}
                      className="btn-base text-sm text-white bg-danger rounded-lg whitespace-nowrap"
                      disabled={loadingCampaignId === campaign.id}
                    >
                      {loadingCampaignId === campaign.id ? "Closing..." : "Close"}
                    </button>
                  ) : null}
                  {campaign.status === "closed" ? (
                    <button
                      type="button"
                      onClick={() => handleReopen(campaign)}
                      className="btn-base btn-secondary text-sm whitespace-nowrap"
                      disabled={loadingCampaignId === campaign.id}
                    >
                      {loadingCampaignId === campaign.id ? "Reopening..." : "Reopen"}
                    </button>
                  ) : null}
                  {campaign.status === "published" ? (
                    <Link
                      href={`/campaigns/${campaign.slug}`}
                      className="btn-base btn-secondary text-sm whitespace-nowrap"
                    >
                      View public page
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(campaign)}
                    className="btn-base text-sm text-white bg-danger rounded-lg whitespace-nowrap"
                    disabled={loadingCampaignId === campaign.id}
                  >
                    {loadingCampaignId === campaign.id ? "Working..." : "Delete"}
                  </button>
                </div>

                {editingCampaignId === campaign.id ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-border bg-surface-muted/40 p-4">
                    <div>
                      <label className="label-text mb-1 block">Title</label>
                      <input
                        className="input-base"
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label-text mb-1 block">Short Description</label>
                      <input
                        className="input-base"
                        value={editForm.shortDescription}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            shortDescription: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label-text mb-1 block">Description</label>
                      <textarea
                        className="input-base min-h-24"
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label-text mb-1 block">Goal Amount</label>
                      <input
                        type="number"
                        min={1}
                        className="input-base"
                        value={editForm.goalAmount}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, goalAmount: event.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(campaign.id)}
                        className="btn-base btn-primary text-sm"
                        disabled={loadingCampaignId === campaign.id}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-base btn-secondary text-sm"
                        disabled={loadingCampaignId === campaign.id}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="card-container p-6 text-center text-muted">
            <p>No campaigns created yet.</p>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
