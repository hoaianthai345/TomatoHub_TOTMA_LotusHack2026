import Link from "next/link";
import type { Campaign } from "@/types/campaign";
import { formatCurrency } from "@/utils/format";

interface CampaignCardProps {
  campaign: Campaign;
}

// Áp dụng card-base và card-hover từ globals.css
export default function CampaignCard({ campaign }: CampaignCardProps) {
  const raisedAmount = campaign.raisedAmount ?? 0;
  const targetAmount = campaign.targetAmount ?? campaign.goalAmount ?? 0;

  const progress =
    targetAmount > 0 ? Math.min(100, (raisedAmount / targetAmount) * 100) : 0;

  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      className="overflow-hidden card-base card-hover flex h-full flex-col"
    >
      <div
        className="h-48 w-full border-b border-border bg-cover bg-center"
        style={{ backgroundImage: `url(${campaign.coverImage})` }}
      />

      <div className="flex flex-1 flex-col p-5">
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

        <h3 className="text-lg font-bold text-heading">{campaign.title}</h3>

        <p className="mt-2 line-clamp-2 flex-1 text-sm text-text-muted">
          {campaign.shortDescription || campaign.description}
        </p>

        <div className="mt-5 space-y-2 rounded-lg border border-border/50 bg-surface-muted p-3 text-sm font-medium text-text">
          <p className="flex justify-between">
            <span>Location:</span>
            <span>{campaign.location}</span>
          </p>

          <p className="flex justify-between">
            <span>Raise:</span>
            <span className="font-bold text-primary">
              {formatCurrency(raisedAmount)} / {formatCurrency(targetAmount)}
            </span>
          </p>

          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
