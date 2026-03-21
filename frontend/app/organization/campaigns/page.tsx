"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listCampaignsByOrganization, publishCampaign } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface-muted text-text-muted border-border",
  published: "bg-success/10 text-success border-success/30",
  closed: "bg-danger/10 text-danger border-danger/30",
};

export default function CampaignsPage() {
  const searchParams = useSearchParams();
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishingCampaignId, setPublishingCampaignId] = useState<string | null>(null);

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

  useEffect(() => {
    const createdCampaignId = searchParams.get("created");
    if (!createdCampaignId) {
      return;
    }

    const createdCampaign = campaigns.find((campaign) => campaign.id === createdCampaignId);
    setSuccessMessage(
      createdCampaign
        ? `Draft "${createdCampaign.title}" was created successfully.`
        : "Draft campaign created successfully."
    );
  }, [campaigns, searchParams]);

  const handlePublish = async (campaignId: string) => {
    if (!accessToken) {
      setErrorMessage("Organization authentication is required to publish a campaign.");
      return;
    }

    setPublishingCampaignId(campaignId);
    setErrorMessage(null);

    try {
      const publishedCampaign = await publishCampaign(campaignId, accessToken);
      setCampaigns((current) =>
        current.map((campaign) =>
          campaign.id === publishedCampaign.id ? publishedCampaign : campaign
        )
      );
      setSuccessMessage(`Campaign "${publishedCampaign.title}" is now published.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to publish campaign."
      );
    } finally {
      setPublishingCampaignId(null);
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
                  {campaign.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => handlePublish(campaign.id)}
                      disabled={publishingCampaignId === campaign.id}
                      className="btn-base btn-primary text-sm disabled:opacity-50"
                    >
                      {publishingCampaignId === campaign.id ? "Publishing..." : "Publish"}
                    </button>
                  ) : null}
                  <Link
                    href={`/campaigns/${campaign.slug}`}
                    className="btn-base btn-secondary text-sm"
                  >
                    View public page
                  </Link>
                </div>
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
