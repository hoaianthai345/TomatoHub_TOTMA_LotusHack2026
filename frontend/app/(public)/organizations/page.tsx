import Link from "next/link";
import { HandHeart, MapPinned, ShieldCheck, Sparkles } from "lucide-react";
import Container from "@/components/common/container";
import StatePanel from "@/components/common/state-panel";
import OrganizationDirectoryCard from "@/components/organization/organization-directory-card";
import { listOrganizations } from "@/lib/api/organizations";
import type { Organization } from "@/types/organization";

function parseValidDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function extractRegionLabel(location?: string): string | null {
  if (!location?.trim()) {
    return null;
  }

  const segments = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return segments.at(-1) ?? segments[0] ?? null;
}

export default async function OrganizationListPage() {
  let organizations: Organization[] = [];
  let loadError = false;

  try {
    organizations = await listOrganizations({ limit: 200 });
  } catch {
    loadError = true;
  }

  const verifiedCount = organizations.filter((item) => item.verified).length;
  const totalCreditScore = organizations.reduce(
    (sum, item) => sum + (item.creditScore ?? 0),
    0
  );
  const averageCreditScore =
    organizations.length > 0 ? Math.round(totalCreditScore / organizations.length) : 0;
  const silverTierOrAboveCount = organizations.filter(
    (item) => (item.creditScore ?? 0) >= 100
  ).length;
  const regionCount = new Set(
    organizations
      .map((item) => extractRegionLabel(item.location))
      .filter((value): value is string => Boolean(value))
  ).size;
  const currentYear = new Date().getFullYear();
  const joinedThisYearCount = organizations.filter((item) => {
    const joinedDate = parseValidDate(item.createdAt);
    return joinedDate?.getFullYear() === currentYear;
  }).length;

  const summaryStats = [
    {
      label: "Partner organizations",
      value: organizations.length.toString(),
      hint: "Active profiles in the public directory.",
    },
    {
      label: "Verified partners",
      value: organizations.length > 0 ? `${verifiedCount}/${organizations.length}` : "0",
      hint: "Organizations with verified trust status.",
    },
    {
      label: "Regions covered",
      value: regionCount.toString(),
      hint: "Distinct city/province labels in profile locations.",
    },
    {
      label: "Avg. credit score",
      value: averageCreditScore.toString(),
      hint: "Average collaboration score from platform activity.",
    },
  ];

  return (
    <div className="bg-page py-6 md:py-8">
      <Container>
        <section className="card-base overflow-hidden border border-primary/20 bg-white p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div>
              <span className="badge-base border border-primary/25 bg-white/90 text-xs text-primary">
                <HandHeart aria-hidden="true" className="icon-14" />
                Charity Partner Network
              </span>
              <h1 className="mt-3 text-3xl font-bold text-heading md:text-4xl">
                Organizations creating direct community impact
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
                Explore trusted nonprofit partners, understand their mission focus,
                and choose where your donations or volunteer effort can create real
                outcomes.
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link href="/campaigns" className="btn-base btn-primary text-sm">
                  Explore campaigns
                </Link>
                <span className="badge-base border border-border bg-white text-xs text-text-muted">
                  <Sparkles aria-hidden="true" className="icon-14" />
                  {silverTierOrAboveCount} orgs in silver tier or above
                </span>
              </div>
            </div>

            <aside className="rounded-2xl border border-primary/15 bg-white/90 p-4 shadow-[0_12px_26px_rgba(17,24,39,0.07)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Partnership principles
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <p className="flex items-start gap-2 text-text">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 icon-16 text-success" />
                  Verified status and credit score help surface trustworthy teams.
                </p>
                <p className="flex items-start gap-2 text-text">
                  <MapPinned aria-hidden="true" className="mt-0.5 icon-16 text-primary" />
                  Location visibility helps supporters choose local impact.
                </p>
                <p className="flex items-start gap-2 text-text">
                  <HandHeart aria-hidden="true" className="mt-0.5 icon-16 text-supporter" />
                  Mission descriptions show what each organization stands for.
                </p>
              </div>
            </aside>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-white/90 p-4 shadow-[0_8px_18px_rgba(17,24,39,0.05)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">{stat.value}</p>
                <p className="mt-1 text-xs text-text-muted">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-primary/15 bg-white/80 p-3 text-sm text-text-muted">
            {joinedThisYearCount > 0
              ? `${joinedThisYearCount} organizations joined in ${currentYear}, expanding support capacity across communities.`
              : `No new organizations joined in ${currentYear} yet.`}
          </div>
        </section>

        {loadError ? (
          <StatePanel
            variant="error"
            className="mt-6"
            title="Organization data unavailable"
            message="Failed to load organizations from the backend."
          />
        ) : null}

        {!loadError && organizations.length === 0 ? (
          <StatePanel
            variant="empty"
            className="mt-6"
            message="No organizations available yet."
          />
        ) : null}

        {organizations.length > 0 ? (
          <section className="mt-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-heading">Meet Our Charity Partners</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Open a profile to review mission context, trust indicators, and
                  campaign timeline before you contribute.
                </p>
              </div>
              <span className="badge-base border border-border bg-surface-light text-xs text-text-muted">
                {organizations.length} organizations listed
              </span>
            </div>

            <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => (
                <OrganizationDirectoryCard
                  key={organization.id}
                  organization={organization}
                />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
