import type { Campaign, CampaignPhase } from "@/types/campaign";

type CampaignPhaseSource = Pick<
  Campaign,
  "status" | "startsAt" | "endsAt" | "isActive"
>;

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

export function getCampaignPhase(
  campaign: CampaignPhaseSource,
  now: Date = new Date()
): CampaignPhase {
  if (campaign.status !== "published") {
    return "ended";
  }

  if (campaign.isActive === false) {
    return "ended";
  }

  const startsAt = parseDate(campaign.startsAt);
  const endsAt = parseDate(campaign.endsAt);

  if (startsAt && now < startsAt) {
    return "upcoming";
  }

  if (endsAt && now > endsAt) {
    return "ended";
  }

  return "live";
}

export function getCampaignPhaseLabel(phase: CampaignPhase): string {
  if (phase === "upcoming") {
    return "Upcoming";
  }
  if (phase === "live") {
    return "Live";
  }
  return "Ended";
}

export function getCampaignPhaseBadgeClass(phase: CampaignPhase): string {
  if (phase === "upcoming") {
    return "badge-base badge-primary";
  }
  if (phase === "live") {
    return "badge-base badge-success";
  }
  return "badge-base border border-border bg-surface-light text-text-muted";
}

