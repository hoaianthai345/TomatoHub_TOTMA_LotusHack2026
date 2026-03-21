import Link from "next/link";
import { notFound } from "next/navigation";
import CampaignCard from "@/components/campaign/campaign-card";
import Container from "@/components/common/container";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import StatusBadge from "@/components/common/status-badge";
import { getCampaignPhase } from "@/lib/campaign-phase";
import { listCampaigns } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { getOrganizationById } from "@/lib/api/organizations";
import type { Campaign } from "@/types/campaign";
import { formatDateTime } from "@/utils/format";

interface OrganizationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toWebsiteHref(value?: string): string | null {
  if (!value?.trim()) {
    return null;
  }

  const website = value.trim();
  if (website.startsWith("http://") || website.startsWith("https://")) {
    return website;
  }

  return `https://${website}`;
}

function sortCampaigns(campaigns: Campaign[], direction: "asc" | "desc"): Campaign[] {
  return [...campaigns].sort((left, right) => {
    const leftDate = parseDate(left.startsAt)?.getTime() ?? 0;
    const rightDate = parseDate(right.startsAt)?.getTime() ?? 0;

    return direction === "asc" ? leftDate - rightDate : rightDate - leftDate;
  });
}

function CampaignSection({
  title,
  description,
  campaigns,
}: {
  title: string;
  description: string;
  campaigns: Campaign[];
}) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-heading">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="card-base p-5 text-sm text-text-muted">
          No campaigns in this section yet.
        </div>
      )}
    </section>
  );
}

export default async function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const { id } = await params;
  let organization: Awaited<ReturnType<typeof getOrganizationById>> | null = null;
  let loadError = false;

  try {
    organization = await getOrganizationById(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    loadError = true;
  }

  if (!organization) {
    return (
      <div className="py-10">
        <Container>
          <StatePanel
            variant="error"
            title="Organization profile unavailable"
            message="Failed to load organization profile from the backend."
          />
        </Container>
      </div>
    );
  }

  let publishedCampaigns: Campaign[] = [];
  let closedCampaigns: Campaign[] = [];

  try {
    [publishedCampaigns, closedCampaigns] = await Promise.all([
      listCampaigns({
        organizationId: id,
        status: "published",
        limit: 200,
      }),
      listCampaigns({
        organizationId: id,
        status: "closed",
        limit: 100,
      }),
    ]);
  } catch {
    loadError = true;
  }

  const campaignById = new Map<string, Campaign>();
  [...publishedCampaigns, ...closedCampaigns].forEach((campaign) => {
    campaignById.set(campaign.id, campaign);
  });
  const allCampaigns = Array.from(campaignById.values());

  const upcomingCampaigns = sortCampaigns(
    allCampaigns.filter((campaign) => {
      const phase = campaign.phase ?? getCampaignPhase(campaign);
      return phase === "upcoming";
    }),
    "asc"
  );
  const liveCampaigns = sortCampaigns(
    allCampaigns.filter((campaign) => {
      const phase = campaign.phase ?? getCampaignPhase(campaign);
      return phase === "live";
    }),
    "asc"
  );
  const endedCampaigns = sortCampaigns(
    allCampaigns.filter((campaign) => {
      const phase = campaign.phase ?? getCampaignPhase(campaign);
      return phase === "ended";
    }),
    "desc"
  );

  const websiteHref = toWebsiteHref(organization.website);

  return (
    <div className="bg-page py-8 md:py-10">
      <Container>
        <section className="card-base overflow-hidden">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_320px] md:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-heading">{organization.name}</h1>
                {organization.verified ? (
                  <StatusBadge kind="verified_state" value="verified" size={14} />
                ) : null}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
                {organization.description || "No public description yet."}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/organizations" className="btn-base btn-secondary text-sm">
                  All organizations
                </Link>
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-base btn-primary text-sm"
                  >
                    Visit website
                  </a>
                ) : null}
              </div>
            </div>

            <aside className="rounded-2xl border border-border bg-surface-light p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
                Organization snapshot
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                <p className="flex items-start justify-between gap-3">
                  <span className="text-text-muted">Location</span>
                  <span className="text-right font-medium text-text">
                    {organization.location ? <span>{organization.location}</span> : <MissingValue />}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-3">
                  <span className="text-text-muted">Credit score</span>
                  <span className="text-right font-medium text-text">
                    {organization.creditScore ?? <MissingValue text="N/A" />}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-3">
                  <span className="text-text-muted">Joined</span>
                  <span className="text-right font-medium text-text">
                    {formatDateTime(organization.createdAt)}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-3">
                  <span className="text-text-muted">Campaigns</span>
                  <span className="text-right font-medium text-text">
                    {allCampaigns.length}
                  </span>
                </p>
              </div>
            </aside>
          </div>
        </section>

        {loadError ? (
          <StatePanel
            variant="warning"
            className="mt-6"
            message="Some campaign data could not be loaded completely."
          />
        ) : null}

        <CampaignSection
          title="Upcoming campaigns"
          description="Campaigns published by this organization and waiting for start time."
          campaigns={upcomingCampaigns}
        />

        <CampaignSection
          title="Live campaigns"
          description="Campaigns currently open for public support."
          campaigns={liveCampaigns}
        />

        <CampaignSection
          title="Ended campaigns"
          description="Campaigns that are closed or have already passed end date."
          campaigns={endedCampaigns}
        />
      </Container>
    </div>
  );
}
