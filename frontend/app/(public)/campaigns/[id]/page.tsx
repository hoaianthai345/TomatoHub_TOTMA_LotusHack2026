import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/common/container";
import CampaignLocationMap from "@/components/campaign/campaign-location-map";
import { getCampaignActivitySummary, getCampaignBySlug } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";

interface CampaignDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { id } = await params;

  try {
    const campaign = await getCampaignBySlug(id);
    const summary = await getCampaignActivitySummary(campaign.id);
    const supportsMoney = campaign.supportTypes?.includes("money") ?? false;
    const supportsVolunteer = campaign.supportTypes?.includes("volunteer") ?? false;
    const hasActionBar = supportsMoney || supportsVolunteer;
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
                    {campaign.location || "Not specified"}
                  </span>
                </p>
                <p className="flex items-start justify-between gap-4">
                  <span className="text-text-muted">Support modes</span>
                  <span className="text-right font-medium text-text">
                    {campaign.supportTypes?.join(", ") || "Open support"}
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
                <div className="mt-4 rounded-xl border border-border bg-surface-muted p-3 text-sm text-text-muted">
                  This campaign currently has no direct money or volunteer flow.
                </div>
              ) : null}
            </aside>
          </section>

          <CampaignLocationMap campaigns={[campaign]} className="mt-8" />
        </Container>

        {hasActionBar ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
            <Container className="py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                    Ready to support
                  </p>
                  <p className="truncate text-sm font-semibold text-heading md:text-base">
                    {campaign.title}
                  </p>
                </div>

                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {supportsMoney ? (
                    <Link
                      href={`/donate?campaignId=${campaign.id}`}
                      className="btn-base btn-primary flex-1 text-center sm:flex-none"
                    >
                      Donate money
                    </Link>
                  ) : null}
                  {supportsVolunteer ? (
                    <Link
                      href={`/supporter/register?campaignId=${campaign.id}`}
                      className="btn-base btn-secondary flex-1 text-center sm:flex-none"
                    >
                      Join volunteer
                    </Link>
                  ) : null}
                </div>
              </div>
            </Container>
          </div>
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
          <div className="card-base p-6 text-sm text-danger">
            Failed to load campaign details from the backend.
          </div>
        </Container>
      </div>
    );
  }
}
