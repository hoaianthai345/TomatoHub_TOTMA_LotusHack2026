import Link from "next/link";
import {
  getCampaignPhase,
  getCampaignPhaseBadgeClass,
  getCampaignPhaseLabel,
} from "@/lib/campaign-phase";
import type { Campaign } from "@/types/campaign";
import { formatCurrency, formatDateTime } from "@/utils/format";

interface CampaignCardProps {
  campaign: Campaign;
}

function buildPhaseDateHint(campaign: Campaign): string {
  const phase = campaign.phase ?? getCampaignPhase(campaign);

  if (phase === "upcoming") {
    return campaign.startsAt ? `Starts: ${formatDateTime(campaign.startsAt)}` : "Upcoming";
  }
  if (phase === "live") {
    return campaign.endsAt ? `Ends: ${formatDateTime(campaign.endsAt)}` : "Live now";
  }

  if (campaign.closedAt) {
    return `Closed: ${formatDateTime(campaign.closedAt)}`;
  }
  if (campaign.endsAt) {
    return `Ended: ${formatDateTime(campaign.endsAt)}`;
  }

  return "Campaign ended";
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const raisedAmount = campaign.raisedAmount ?? 0;
  const targetAmount = campaign.targetAmount ?? campaign.goalAmount ?? 0;
  const phase = campaign.phase ?? getCampaignPhase(campaign);
  const phaseHint = buildPhaseDateHint(campaign);

  const progress =
    targetAmount > 0 ? Math.min(100, (raisedAmount / targetAmount) * 100) : 0;

  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      className="card-base card-hover flex h-full flex-col overflow-hidden"
    >
      <div
        className="h-48 w-full border-b border-border bg-cover bg-center"
        style={{ backgroundImage: `url(${campaign.coverImage})` }}
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className={getCampaignPhaseBadgeClass(phase)}>
            {getCampaignPhaseLabel(phase)}
          </span>

          {campaign.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-bold text-heading">{campaign.title}</h3>

        <p className="mt-2 line-clamp-2 flex-1 text-sm text-text-muted">
          {campaign.shortDescription || campaign.description}
        </p>

        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          {phaseHint}
        </p>

        <div className="mt-5 space-y-2 rounded-lg border border-border/50 bg-surface-muted p-3 text-sm font-medium text-text">
          <p className="flex justify-between gap-3">
            <span>Location:</span>
            <span className="text-right">{campaign.location || "Not specified"}</span>
          </p>

          <p className="flex justify-between gap-3">
            <span>Raise:</span>
            <span className="text-right font-bold text-primary">
              {formatCurrency(raisedAmount)} / {formatCurrency(targetAmount)}
            </span>
          </p>

          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

