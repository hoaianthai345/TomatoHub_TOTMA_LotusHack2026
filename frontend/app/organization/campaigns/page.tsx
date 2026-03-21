"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import {
  deleteCampaign,
  listCampaignsByOrganization,
  publishCampaign,
  updateCampaign,
} from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface-muted text-text-muted border-border",
  published: "bg-success/10 text-success border-success/30",
  closed: "bg-danger/10 text-danger border-danger/30",
};

export default function CampaignsPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
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
        const response = await listCampaignsByOrganization(organizationId, {
          limit: 200,
        });
        if (!cancelled) {
          setCampaigns(response);
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
  }, [currentUser?.organizationId, currentUser?.role, isLoading]);

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
          title: editForm.title.trim(),
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
      setSuccessMessage("Campaign published successfully.");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to publish campaign."
      );
    } finally {
      setLoadingCampaignId(null);
    }
  };

  return (
    <RoleGate role="organization" loadingMessage="Loading campaigns...">
      <div className="p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold">Campaigns</h1>
            <p className="text-body">Manage your campaigns</p>
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
                </div>

                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/campaigns/${campaign.slug}`}
                    className="btn-base btn-secondary text-sm"
                  >
                    View public page
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEdit(campaign)}
                    className="btn-base btn-secondary text-sm"
                    disabled={loadingCampaignId === campaign.id}
                  >
                    Edit
                  </button>
                  {campaign.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => handlePublish(campaign)}
                      className="btn-base btn-primary text-sm"
                      disabled={loadingCampaignId === campaign.id}
                    >
                      Publish
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(campaign)}
                    className="btn-base text-sm text-white bg-danger rounded-lg"
                    disabled={loadingCampaignId === campaign.id}
                  >
                    Delete
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
