import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/common/container";
import CampaignLocationMap from "@/components/campaign/campaign-location-map";
import CampaignDetailActionBar from "@/components/campaign/campaign-detail-action-bar";
import CampaignVolunteerCheckinPanel from "@/components/campaign/campaign-volunteer-checkin-panel";
import CampaignOrganizationQrSection from "@/components/campaign/campaign-organization-qr-section";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import StatusBadge from "@/components/common/status-badge";
import { getCampaignPhase } from "@/lib/campaign-phase";
import { getCampaignActivitySummary, getCampaignBySlug } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { getOrganizationById } from "@/lib/api/organizations";
import { formatCurrency, formatDateTime } from "@/utils/format";

interface CampaignDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function buildPhaseHint(campaign: {
  phase?: "upcoming" | "live" | "ended";
  startsAt?: string;
  endsAt?: string;
  closedAt?: string;
  status: "draft" | "published" | "closed";
  isActive?: boolean;
}): string {
  const phase = campaign.phase ?? getCampaignPhase(campaign);

  if (phase === "upcoming") {
    return campaign.startsAt
      ? `Starts ${formatDateTime(campaign.startsAt)}`
      : "Campaign is upcoming";
  }

  if (phase === "live") {
    return campaign.endsAt ? `Ends ${formatDateTime(campaign.endsAt)}` : "Campaign is live now";
  }

  if (campaign.closedAt) {
    return `Closed ${formatDateTime(campaign.closedAt)}`;
  }
  if (campaign.endsAt) {
    return `Ended ${formatDateTime(campaign.endsAt)}`;
  }

  return "Campaign ended";
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { id } = await params;

  try {
    const campaign = await getCampaignBySlug(id);
    const [summary, organization] = await Promise.all([
      getCampaignActivitySummary(campaign.id),
      getOrganizationById(campaign.organizationId).catch(() => null),
    ]);
    const supportsMoney = campaign.supportTypes?.includes("money") ?? false;
    const supportsVolunteer = campaign.supportTypes?.includes("volunteer") ?? false;
    const hasActionBar = supportsMoney || supportsVolunteer;
    const phase = campaign.phase ?? getCampaignPhase(campaign);
    const phaseHint = buildPhaseHint(campaign);
    const goalAmount = campaign.goalAmount ?? campaign.targetAmount ?? 0;
    const raisedAmount = campaign.raisedAmount ?? 0;
    const progressPercent =
      goalAmount > 0 ? Math.min(100, (raisedAmount / goalAmount) * 100) : 0;

    return (
      <div className={`py-10 ${hasActionBar ? "pb-32" : ""}`}>
        <Container>
          <section className="overflow-hidden card-base">
            <div
              className="h-64 w-full border-b border-border bg-cover bg-center md:h-80"
              style={{ backgroundImage: `url(${campaign.coverImage})` }}
            />
            <div className="p-6 md:p-8">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge kind="campaign_phase" value={phase} size={14} />
                {campaign.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl font-bold text-heading md:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-text-muted md:text-base">
                {campaign.description || campaign.shortDescription}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                {phaseHint}
              </p>

              <div className="mt-6 rounded-2xl border border-border bg-surface-muted p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-text-muted">
                    Raised{" "}
                    <span className="font-semibold text-primary">
                      {formatCurrency(raisedAmount)}
                    </span>{" "}
                    / {formatCurrency(goalAmount)}
                  </p>
                  <p className="text-text-muted">Progress {progressPercent.toFixed(0)}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <article className="card-base p-6 md:p-7">
              <h2 className="text-xl font-bold text-heading">Campaign overview</h2>
              <p className="mt-3 text-sm leading-7 text-text-muted">
                This campaign is currently managed by the organization and accepts support
                according to its active support modes. Use the sticky action bar to go to
                the exact flow you need.
              </p>
              {organization ? (
                <Link
                  href={`/organizations/${organization.id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-primary"
                >
                  View organization profile
                </Link>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Beneficiaries
                  </p>
                  <p className="mt-2 text-xl font-bold text-heading">
                    {summary.beneficiaryCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Supporters
                  </p>
                  <p className="mt-2 text-xl font-bold text-heading">
                    {summary.supporterCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Donations
                  </p>
                  <p className="mt-2 text-xl font-bold text-heading">
                    {summary.donationCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Volunteer registrations
                  </p>
                  <p className="mt-2 text-xl font-bold text-heading">
                    {summary.volunteerRegistrationCount}
                  </p>
                </div>
              </div>
            </article>

            <aside className="card-base h-fit p-6">
              <h3 className="text-lg font-semibold text-heading">Quick facts</h3>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Location</span>
                  <span className="text-right font-medium text-text">
                    {campaign.location ? <span>{campaign.location}</span> : <MissingValue />}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Support modes</span>
                  <span className="text-right font-medium text-text">
                    {campaign.supportTypes?.join(", ") || "Open support"}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Campaign phase</span>
                  <span className="text-right font-medium text-text">
                    <StatusBadge
                      kind="campaign_phase"
                      value={phase}
                      size={14}
                      className="align-middle"
                    />
                  </span>
                </p>
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Organization</span>
                  <span className="text-right font-medium text-text">
                    {organization ? (
                      <Link
                        href={`/organizations/${organization.id}`}
                        className="text-primary hover:underline"
                      >
                        {organization.name}
                      </Link>
                    ) : (
                      campaign.organizationId
                    )}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Published at</span>
                  <span className="text-right font-medium text-text">
                    {formatDateTime(campaign.publishedAt || campaign.createdAt)}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Ends at</span>
                  <span className="text-right font-medium text-text">
                    {formatDateTime(campaign.endsAt)}
                  </span>
                </p>
              </div>
              {!hasActionBar ? (
                <StatePanel
                  variant="info"
                  className="mt-4"
                  message="This campaign currently has no direct money or volunteer flow."
                />
              ) : null}
            </aside>
          </section>

          {supportsVolunteer ? (
            <CampaignVolunteerCheckinPanel
              campaignId={campaign.id}
              campaignOrganizationId={campaign.organizationId}
            />
          ) : null}
          {supportsVolunteer ? (
            <CampaignOrganizationQrSection
              campaignId={campaign.id}
              campaignOrganizationId={campaign.organizationId}
            />
          ) : null}

          <CampaignLocationMap campaigns={[campaign]} className="mt-8" />
        </Container>

        {hasActionBar ? (
          <CampaignDetailActionBar
            campaignId={campaign.id}
            campaignSlug={campaign.slug}
            campaignTitle={campaign.title}
            supportsMoney={supportsMoney}
            supportsVolunteer={supportsVolunteer}
          />
        ) : null}
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return (
      <div className="py-10">
        <Container>
          <StatePanel
            variant="error"
            title="Campaign details unavailable"
            message="Failed to load campaign details from the backend."
          />
        </Container>
      </div>
    );
  }
}
