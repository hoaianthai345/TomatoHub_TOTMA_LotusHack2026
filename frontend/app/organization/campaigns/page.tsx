"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listCampaignsByOrganization, publishCampaign } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { listVolunteerRegistrations } from "@/lib/api/volunteer-registrations";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { VolunteerRegistration } from "@/types/volunteer-registration";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface-muted text-text-muted border-border",
  published: "bg-success/10 text-success border-success/30",
  closed: "bg-danger/10 text-danger border-danger/30",
};

export default function CampaignsPage() {
  const searchParams = useSearchParams();
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
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
        const [response, registrationList] = await Promise.all([
          listCampaignsByOrganization(organizationId, {
            limit: 200,
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

  useEffect(() => {
    const updatedCampaignId = searchParams.get("updated");
    if (!updatedCampaignId) {
      return;
    }

    const updatedCampaign = campaigns.find((campaign) => campaign.id === updatedCampaignId);
    setSuccessMessage(
      updatedCampaign
        ? `Campaign "${updatedCampaign.title}" was updated successfully.`
        : "Campaign updated successfully."
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

  const registrationStatsByCampaign = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
      }
    >();

    registrations.forEach((registration) => {
      const current = map.get(registration.campaignId) ?? {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      };
      current.total += 1;
      if (registration.status === "approved") current.approved += 1;
      if (registration.status === "pending") current.pending += 1;
      if (registration.status === "rejected") current.rejected += 1;
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
          return acc;
        },
        { total: 0, approved: 0, pending: 0, rejected: 0 }
      ),
    [registrations]
  );

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
                    {registrationStatsByCampaign.get(campaign.id)?.pending ?? 0})
                  </p>
                </div>

                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/organization/campaigns/${campaign.id}/edit`}
                    className="btn-base btn-secondary text-sm"
                  >
                    Edit
                  </Link>
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
                  {campaign.status === "published" ? (
                    <Link
                      href={`/campaigns/${campaign.slug}`}
                      className="btn-base btn-secondary text-sm"
                    >
                      View public page
                    </Link>
                  ) : null}
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
