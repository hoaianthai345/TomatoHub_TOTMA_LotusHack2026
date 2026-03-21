"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CampaignLocationMap from "@/components/campaign/campaign-location-map";
import { useAuth } from "@/lib/auth";
import {
  getCampaignPhase,
  getCampaignPhaseBadgeClass,
  getCampaignPhaseLabel,
} from "@/lib/campaign-phase";
import type { Campaign, CampaignSupportType } from "@/types/campaign";
import { formatCurrency, formatDateTime } from "@/utils/format";

interface CampaignBrowserProps {
  campaigns: Campaign[];
}

type SupportFilter = "all" | CampaignSupportType;

const SUPPORT_FILTER_OPTIONS: Array<{ value: SupportFilter; label: string }> = [
  { value: "all", label: "All support types" },
  { value: "volunteer", label: "Volunteer needed" },
  { value: "money", label: "Money donation" },
  { value: "goods", label: "Goods donation" },
];

const SUPPORT_BADGE_LABEL: Record<CampaignSupportType, string> = {
  money: "Money",
  goods: "Goods",
  volunteer: "Volunteer",
};

const SUPPORT_BADGE_CLASS: Record<CampaignSupportType, string> = {
  money: "badge-support-money",
  goods: "badge-support-goods",
  volunteer: "badge-support-volunteer",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll("\u0111", "d")
    .replaceAll("\u0110", "d")
    .toLowerCase()
    .trim();
}

function buildLocationTokens(location: string): string[] {
  const segments = location
    .split(",")
    .map((segment) => normalizeText(segment))
    .filter((segment) => segment.length >= 2);

  if (segments.length > 0) {
    return Array.from(new Set(segments));
  }

  const fallback = normalizeText(location);
  return fallback ? [fallback] : [];
}

function extractProvinceLabel(campaign: Campaign): string {
  if (campaign.province?.trim()) {
    return campaign.province.trim();
  }

  const locationSegments = campaign.location
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return locationSegments.at(-1) ?? "";
}

function campaignMatchesKeyword(campaign: Campaign, keyword: string): boolean {
  if (!keyword) {
    return true;
  }

  const haystack = normalizeText(
    [
      campaign.title,
      campaign.shortDescription,
      campaign.description,
      campaign.location,
      campaign.tags.join(" "),
    ].join(" ")
  );

  return haystack.includes(normalizeText(keyword));
}

function campaignMatchesProvince(campaign: Campaign, provinceFilter: string): boolean {
  if (provinceFilter === "all") {
    return true;
  }

  const province = normalizeText(provinceFilter);
  const source = normalizeText(
    [campaign.province, campaign.location].filter(Boolean).join(" ")
  );

  return source.includes(province);
}

function campaignMatchesSupportType(
  campaign: Campaign,
  supportFilter: SupportFilter
): boolean {
  if (supportFilter === "all") {
    return true;
  }

  return campaign.supportTypes?.includes(supportFilter) ?? false;
}

function campaignMatchesUserLocation(campaign: Campaign, userTokens: string[]): boolean {
  if (userTokens.length === 0) {
    return false;
  }

  const locationSource = normalizeText(
    [campaign.addressLine, campaign.district, campaign.province, campaign.location]
      .filter(Boolean)
      .join(" ")
  );

  return userTokens.some((token) => locationSource.includes(token));
}

function buildSupportSummary(campaign: Campaign): string {
  if (!campaign.supportTypes?.length) {
    return "Open support";
  }

  return campaign.supportTypes.map((type) => SUPPORT_BADGE_LABEL[type]).join(" / ");
}

function buildPhaseHint(campaign: Campaign): string {
  const phase = campaign.phase ?? getCampaignPhase(campaign);

  if (phase === "upcoming") {
    return campaign.startsAt
      ? `Starts ${formatDateTime(campaign.startsAt)}`
      : "Upcoming campaign";
  }

  if (phase === "live") {
    return campaign.endsAt ? `Ends ${formatDateTime(campaign.endsAt)}` : "Live now";
  }

  if (campaign.closedAt) {
    return `Closed ${formatDateTime(campaign.closedAt)}`;
  }
  if (campaign.endsAt) {
    return `Ended ${formatDateTime(campaign.endsAt)}`;
  }

  return "Campaign ended";
}

export default function CampaignBrowser({ campaigns }: CampaignBrowserProps) {
  const { currentUser } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [supportFilter, setSupportFilter] = useState<SupportFilter>("all");
  const [nearMyLocationOnly, setNearMyLocationOnly] = useState(false);

  const userLocationLabel = currentUser?.location?.trim() ?? "";
  const userLocationTokens = useMemo(
    () => (userLocationLabel ? buildLocationTokens(userLocationLabel) : []),
    [userLocationLabel]
  );
  const hasUserLocation = userLocationTokens.length > 0;

  const provinceOptions = useMemo(() => {
    const options = new Set<string>();

    campaigns.forEach((campaign) => {
      const province = extractProvinceLabel(campaign);
      if (province) {
        options.add(province);
      }
    });

    return Array.from(options).sort((left, right) =>
      left.localeCompare(right, "vi")
    );
  }, [campaigns]);

  const nearbyCampaignCount = useMemo(() => {
    if (!hasUserLocation) {
      return 0;
    }

    return campaigns.filter((campaign) =>
      campaignMatchesUserLocation(campaign, userLocationTokens)
    ).length;
  }, [campaigns, hasUserLocation, userLocationTokens]);

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign) => {
        if (!campaignMatchesKeyword(campaign, keyword)) {
          return false;
        }
        if (!campaignMatchesProvince(campaign, provinceFilter)) {
          return false;
        }
        if (!campaignMatchesSupportType(campaign, supportFilter)) {
          return false;
        }
        if (
          nearMyLocationOnly &&
          !campaignMatchesUserLocation(campaign, userLocationTokens)
        ) {
          return false;
        }

        return true;
      }),
    [campaigns, keyword, nearMyLocationOnly, provinceFilter, supportFilter, userLocationTokens]
  );

  const totalRaised = filteredCampaigns.reduce(
    (total, campaign) => total + (campaign.raisedAmount ?? 0),
    0
  );
  const totalGoal = filteredCampaigns.reduce(
    (total, campaign) => total + (campaign.goalAmount ?? campaign.targetAmount ?? 0),
    0
  );
  const mappedCount = filteredCampaigns.filter(
    (campaign) => campaign.coordinates !== null
  ).length;

  return (
    <>
      <section className="card-base p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-heading">Campaign List</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Find campaigns by support type and location, then open each campaign
              detail page to take action.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs text-text-muted">
            {hasUserLocation
              ? `Your location: ${userLocationLabel}`
              : "Login with a saved location to unlock near-you filter."}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Matching campaigns
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{filteredCampaigns.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Total raised
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{formatCurrency(totalRaised)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Total goal
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{formatCurrency(totalGoal)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Map-ready campaigns
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">
              {mappedCount}/{filteredCampaigns.length}
            </p>
            {hasUserLocation ? (
              <p className="mt-1 text-xs text-text-muted">
                Near you: {nearbyCampaignCount}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium text-heading">Search</span>
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="input-base"
              placeholder="Search by title, tag, or location"
            />
          </label>

          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium text-heading">Province / City</span>
            <select
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
              className="input-base"
            >
              <option value="all">All provinces</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-text">
            <span className="mb-2 block font-medium text-heading">Support type</span>
            <select
              value={supportFilter}
              onChange={(event) => setSupportFilter(event.target.value as SupportFilter)}
              className="input-base"
            >
              {SUPPORT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNearMyLocationOnly((value) => !value)}
            disabled={!hasUserLocation}
            className={`btn-base ${
              nearMyLocationOnly ? "btn-primary" : "btn-secondary"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {nearMyLocationOnly ? "Showing nearby only" : "Near my location"}
          </button>
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setProvinceFilter("all");
              setSupportFilter("all");
              setNearMyLocationOnly(false);
            }}
            className="btn-base btn-secondary"
          >
            Reset filters
          </button>
        </div>
      </section>

      {filteredCampaigns.length > 0 ? (
        <CampaignLocationMap campaigns={filteredCampaigns} className="mt-6" />
      ) : null}

      {filteredCampaigns.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const goalAmount = campaign.goalAmount ?? campaign.targetAmount ?? 0;
            const raisedAmount = campaign.raisedAmount ?? 0;
            const phase = campaign.phase ?? getCampaignPhase(campaign);
            const phaseHint = buildPhaseHint(campaign);
            const progress =
              goalAmount > 0 ? Math.min(100, (raisedAmount / goalAmount) * 100) : 0;

            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.slug}`}
                className="card-base card-hover flex h-full flex-col overflow-hidden"
              >
                <div
                  className="h-52 w-full border-b border-border bg-cover bg-center"
                  style={{ backgroundImage: `url(${campaign.coverImage})` }}
                />

                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={getCampaignPhaseBadgeClass(phase)}>
                      {getCampaignPhaseLabel(phase)}
                    </span>
                    {(campaign.tags.length ? campaign.tags : ["campaign"]).slice(0, 3).map((tag) => (
                      <span
                        key={`${campaign.id}-${tag}`}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-bold text-heading">
                    {campaign.title}
                  </h3>

                  <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm text-text-muted">
                    {campaign.shortDescription || campaign.description}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                    {phaseHint}
                  </p>

                  <div className="mt-4 flex min-h-[2rem] flex-wrap gap-2">
                    {campaign.supportTypes?.length ? (
                      campaign.supportTypes.map((type) => (
                        <span
                          key={`${campaign.id}-${type}`}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${SUPPORT_BADGE_CLASS[type]}`}
                        >
                          {SUPPORT_BADGE_LABEL[type]}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-text">
                        Open support
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface-muted p-4 text-sm">
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Location</span>
                      <span className="text-right font-medium text-text">
                        {campaign.location || "Location pending"}
                      </span>
                    </p>
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Support</span>
                      <span className="text-right font-medium text-text">
                        {buildSupportSummary(campaign)}
                      </span>
                    </p>
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Raised</span>
                      <span className="text-right font-semibold text-primary">
                        {formatCurrency(raisedAmount)} / {formatCurrency(goalAmount)}
                      </span>
                    </p>
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Published</span>
                      <span className="text-right font-medium text-text">
                        {formatDateTime(campaign.publishedAt || campaign.createdAt)}
                      </span>
                    </p>

                    <div className="h-2 overflow-hidden rounded-full bg-border">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 card-base p-6 text-sm text-text-muted">
          No campaigns match your current filters. Try resetting filters or switching
          support type.
        </div>
      )}
    </>
  );
}
