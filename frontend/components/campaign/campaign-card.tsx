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
    <article className="overflow-hidden card-base card-hover flex flex-col">
      <div
        className="h-48 w-full bg-cover bg-center border-b border-border"
        style={{ backgroundImage: `url(${campaign.coverImage})` }}
      />

      <div className="p-5 flex-1 flex flex-col">
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

        <p className="mt-2 text-sm text-text-muted flex-1 line-clamp-2">
          {campaign.shortDescription || campaign.description}
        </p>

        <div className="mt-5 space-y-2 text-sm text-text font-medium bg-surface-muted p-3 rounded-lg border border-border/50">
          <p className="flex justify-between">
            <span>Location:</span>
            <span>{campaign.location}</span>
          </p>

          <p className="flex justify-between">
            <span>Raise:</span>
            <span className="text-primary font-bold">
              {formatCurrency(raisedAmount)} / {formatCurrency(targetAmount)}
            </span>
          </p>

          <div className="h-2 w-full bg-border rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link
          href={`/campaigns/${campaign.slug}`}
          className="mt-5 w-full btn-base btn-primary"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
