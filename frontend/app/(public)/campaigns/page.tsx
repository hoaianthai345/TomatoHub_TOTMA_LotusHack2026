import Container from "@/components/common/container";
import CampaignLocationMap from "@/components/campaign/campaign-location-map";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import Link from "next/link";

export default async function CampaignListPage() {
  let campaigns: Campaign[] = [];

  try {
    campaigns = await listPublishedCampaigns();
  } catch {
    campaigns = [];
  }

  const totalRaised = campaigns.reduce(
    (total, campaign) => total + (campaign.raisedAmount ?? 0),
    0
  );
  const totalGoal = campaigns.reduce(
    (total, campaign) =>
      total + (campaign.goalAmount ?? campaign.targetAmount ?? 0),
    0
  );
  const mappedCount = campaigns.filter((campaign) => campaign.coordinates !== null).length;

  const supportLabel = (campaign: Campaign): string => {
    if (!campaign.supportTypes?.length) {
      return "Open support";
    }

    return campaign.supportTypes.map((item) => item.toUpperCase()).join(" / ");
  };

  return (
    <div className="py-8 md:py-10">
      <Container>
        <section className="card-base p-6 md:p-7">
          <h1 className="text-3xl font-bold text-heading">Campaign List</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">
            Public campaigns with key details, fundraising progress, and mapped locations.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Published campaigns
              </p>
              <p className="mt-2 text-2xl font-bold text-heading">{campaigns.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Total raised
              </p>
              <p className="mt-2 text-2xl font-bold text-heading">
                {formatCurrency(totalRaised)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Total goal
              </p>
              <p className="mt-2 text-2xl font-bold text-heading">
                {formatCurrency(totalGoal)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Exact coordinates
              </p>
              <p className="mt-2 text-2xl font-bold text-heading">
                {mappedCount}/{campaigns.length}
              </p>
            </div>
          </div>
        </section>

        <CampaignLocationMap campaigns={campaigns} className="mt-6" />

        {campaigns.length > 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="card-base overflow-hidden">
                <Link href={`/campaigns/${campaign.slug}`} className="block">
                  <div
                    className="h-48 w-full border-b border-border bg-cover bg-center"
                    style={{ backgroundImage: `url(${campaign.coverImage})` }}
                  />
                </Link>

                <div className="p-5">
                  <Link
                    href={`/campaigns/${campaign.slug}`}
                    className="text-xl font-bold text-heading hover:text-primary"
                  >
                    {campaign.title}
                  </Link>

                  <p className="mt-2 line-clamp-3 text-sm text-text-muted">
                    {campaign.shortDescription || campaign.description}
                  </p>

                  <div className="mt-4 grid gap-2 rounded-xl border border-border bg-surface-muted p-4 text-sm">
                    <p className="flex justify-between gap-3">
                      <span className="text-text-muted">Location</span>
                      <span className="text-right font-medium text-text">
                        {campaign.location || "Location pending"}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-text-muted">Support types</span>
                      <span className="text-right font-medium text-text">
                        {supportLabel(campaign)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-text-muted">Fundraising</span>
                      <span className="text-right font-semibold text-primary">
                        {formatCurrency(campaign.raisedAmount)} /{" "}
                        {formatCurrency(campaign.goalAmount ?? campaign.targetAmount)}
                      </span>
                    </p>
                    <p className="flex justify-between gap-3">
                      <span className="text-text-muted">Published</span>
                      <span className="text-right font-medium text-text">
                        {formatDateTime(campaign.publishedAt || campaign.createdAt)}
                      </span>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 card-base p-6 text-sm text-text-muted">
            No published campaigns are available from the backend right now.
          </div>
        )}
      </Container>
    </div>
  );
}
