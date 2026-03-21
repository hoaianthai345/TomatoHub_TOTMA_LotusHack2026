import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CircleDot, HandHeart, HeartHandshake, LifeBuoy, MoveRight } from "lucide-react";
import Container from "@/components/common/container";
import CampaignCard from "@/components/campaign/campaign-card";
import NearbyCampaignMap from "@/components/campaign/nearby-campaign-map";
import MissingValue from "@/components/common/missing-value";
import SectionTitle from "@/components/common/section-title";
import StatePanel from "@/components/common/state-panel";
import { getPlatformActivitySummary, listPublishedCampaigns } from "@/lib/api/campaigns";
import { formatCurrency } from "@/utils/format";
import type { Campaign } from "@/types/campaign";

function sumBy(
  campaigns: Campaign[],
  selector: (campaign: Campaign) => number | undefined
): number {
  return campaigns.reduce((total, campaign) => total + (selector(campaign) ?? 0), 0);
}

function pickCampaign(campaigns: Campaign[], index: number): Campaign | null {
  return campaigns[index] ?? campaigns[0] ?? null;
}

function supportLabel(campaign: Campaign): string {
  if (!campaign.supportTypes?.length) {
    return "Open support";
  }

  if (campaign.supportTypes.includes("volunteer")) {
    return "Volunteer";
  }

  if (campaign.supportTypes.includes("goods")) {
    return "Goods";
  }

  return "Donate";
}

function statValue(value: number): string {
  return value > 0 ? value.toLocaleString("en-US") : "0";
}

function ActionCard({
  title,
  description,
  eyebrow,
  href,
  icon: Icon,
  variant,
}: {
  title: string;
  description: string;
  eyebrow: string;
  href: string;
  icon: LucideIcon;
  variant: "primary" | "light";
}) {
  const palette =
    variant === "primary"
      ? "bg-primary text-white border-primary/20"
      : "bg-white text-heading border-border";

  const bodyText = variant === "primary" ? "text-white/80" : "text-text-muted";
  const iconPalette =
    variant === "primary"
      ? "border-white/35 bg-white/20 text-white"
      : "border-primary/20 bg-primary/10 text-primary";

  return (
    <Link
      href={href}
      className={`group flex min-h-[250px] flex-col justify-between rounded-[2rem] border p-6 shadow-card-token transition duration-200 hover:-translate-y-0.5 ${palette}`}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-full border ${iconPalette}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
          {eyebrow}
        </p>
        <h3 className="mt-3 text-2xl font-bold">{title}</h3>
        <p className={`mt-3 text-sm leading-7 ${bodyText}`}>{description}</p>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
        Learn more
        <MoveRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default async function HomePage() {
  let campaigns: Campaign[] = [];
  let totalSupporters = 0;
  let totalBeneficiaries = 0;

  const [campaignsResult, platformSummaryResult] = await Promise.allSettled([
    listPublishedCampaigns(8),
    getPlatformActivitySummary(),
  ]);

  if (campaignsResult.status === "fulfilled") {
    campaigns = campaignsResult.value;
  }

  if (platformSummaryResult.status === "fulfilled") {
    totalSupporters = platformSummaryResult.value.supporterCount;
    totalBeneficiaries = platformSummaryResult.value.beneficiaryCount;
  }

  const heroCampaign = pickCampaign(campaigns, 0);
  const spotlightCampaign = pickCampaign(campaigns, 1) ?? heroCampaign;
  const updateCampaigns = campaigns.slice(0, 3);
  const mapCampaigns = campaigns.filter((campaign) => campaign.coordinates !== null);

  const totalRaised = sumBy(campaigns, (campaign) => campaign.raisedAmount);

  return (
    <div className="bg-page py-8 md:py-10">
      <Container>
        <section className="hero-gradient shadow-card-token overflow-hidden rounded-[2.5rem] border border-border px-5 py-8 md:px-8 md:py-10 lg:px-10">
          <div className="flex flex-col gap-8">
            <div>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="inline-flex items-center rounded-full border border-border bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  TomatoHub Community
                </div>
                <Link
                  href="/campaigns"
                  className="hidden rounded-full border border-border bg-white/90 px-5 py-2 text-sm font-semibold text-heading md:inline-flex"
                >
                  Browse all
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-4 text-[clamp(3.6rem,9vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.06em] text-heading">
                <span>Hope</span>
                <div className="shadow-popover-token overflow-hidden rounded-full border border-border bg-white">
                  {heroCampaign ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/herohome.jpg"
                        alt={heroCampaign.title}
                        className="h-[92px] w-[180px] object-cover sm:h-[110px] sm:w-[240px] lg:h-[126px] lg:w-[320px]"
                      />
                    </>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/images/TOMATOHUB.svg"
                        alt="TomatoHub"
                        className="h-[92px] w-[180px] object-contain bg-white px-5 py-4 sm:h-[110px] sm:w-[240px] lg:h-[126px] lg:w-[320px]"
                      />
                    </>
                  )}
                </div>
                <span>Moves</span>
                <span>With Support</span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/campaigns" className="btn-base rounded-full !px-6 btn-primary">
                  Donate now
                </Link>
                <Link
                  href="/signup/organization"
                  className="btn-base rounded-full !px-6 btn-secondary"
                >
                  Join as organization
                </Link>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-4">
              <div className="rounded-2xl bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Raised
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {formatCurrency(totalRaised)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Supporters
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {statValue(totalSupporters)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Beneficiaries
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {statValue(totalBeneficiaries)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Live campaigns
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {statValue(campaigns.length)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="accent-pill inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              What we do
            </div>
            <h2 className="mt-6 text-4xl font-bold leading-tight text-heading md:text-5xl">
              Real help, clear action,
              <br />
              and stories people can trust.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-text-muted">
              TomatoHub makes it easier to discover public campaigns, support the
              right need, and follow progress without friction.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <ActionCard
              eyebrow="Support"
              title="Make a donation"
              description="Fund urgent needs, recovery efforts, and direct campaign goals in just a few taps."
              href="/campaigns"
              icon={HeartHandshake}
              variant="light"
            />
            <ActionCard
              eyebrow="Relief"
              title="Get support"
              description="Start a campaign, share verified updates, and connect your cause with people who care."
              href="/signup/organization"
              icon={LifeBuoy}
              variant="light"
            />
            <ActionCard
              eyebrow="Community"
              title="Become a volunteer"
              description="Join campaigns that need time, hands, and field support in your area."
              href="/signup/supporter"
              icon={HandHeart}
              variant="primary"
            />
          </div>
        </section>

        {spotlightCampaign ? (
          <Link
            href={`/campaigns/${spotlightCampaign.slug}`}
            className="card-hover shadow-card-token mt-12 block overflow-hidden rounded-[2.5rem] border border-border bg-white"
          >
            <div className="p-6 text-center md:p-10">
              <div className="inline-flex rounded-full border border-border bg-surface-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Spotlight story
              </div>
              <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-heading md:text-5xl">
                {spotlightCampaign.title}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-text-muted">
                {spotlightCampaign.shortDescription || spotlightCampaign.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-text-muted">
                <span>
                  {spotlightCampaign.location ? (
                    <span>{spotlightCampaign.location}</span>
                  ) : (
                    <MissingValue text="Across Vietnam" />
                  )}
                </span>
                <CircleDot className="icon-14" aria-hidden="true" />
                <span>{supportLabel(spotlightCampaign)}</span>
                <CircleDot className="icon-14" aria-hidden="true" />
                <span>{formatCurrency(spotlightCampaign.raisedAmount)} raised</span>
              </div>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={spotlightCampaign.coverImage}
              alt={spotlightCampaign.title}
              className="h-[280px] w-full object-cover md:h-[420px]"
            />

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-6 md:px-10">
              <p className="text-sm text-text-muted">
                See the campaign details, support types, and latest progress in one
                page.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Open campaign <MoveRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ) : null}

        <section className="mt-12">
          <SectionTitle
            title="Field Updates"
            description="A quick view of the latest campaigns and stories from the platform."
          />

          {updateCampaigns.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {updateCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <StatePanel
              variant="empty"
              message="There are no campaign updates available right now."
            />
          )}
        </section>

        {mapCampaigns.length > 0 ? (
          <section className="mt-12">
            <SectionTitle
              title="Campaigns Near You"
              description="Use your location to discover nearby public campaigns."
            />
            <div className="mb-8">
              <NearbyCampaignMap campaigns={mapCampaigns} maxCampaigns={3} />
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
