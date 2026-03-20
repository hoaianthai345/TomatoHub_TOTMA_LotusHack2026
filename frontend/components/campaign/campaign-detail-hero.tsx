import type { Campaign } from "@/types/campaign";
import { formatCurrency } from "@/utils/format";

interface CampaignDetailHeroProps {
  campaign: Campaign;
  beneficiaryCount?: number;
  supporterCount?: number;
}

export default function CampaignDetailHero({
  campaign,
  beneficiaryCount = 0,
  supporterCount = 0,
}: CampaignDetailHeroProps) {
  return (
    <section className="overflow-hidden card-base">
      <div
        className="h-64 w-full bg-cover bg-center border-b border-border md:h-80"
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

        <h1 className="text-3xl font-bold text-heading">{campaign.title}</h1>
        <p className="mt-3 max-w-3xl text-text-muted">{campaign.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/50 bg-surface-muted p-4">
            <p className="text-sm text-text-muted">Location</p>
            <p className="mt-1 font-semibold text-heading">
              {campaign.location || "Not specified"}
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-surface-muted p-4">
            <p className="text-sm text-text-muted">Beneficiaries</p>
            <p className="mt-1 font-semibold text-heading">{beneficiaryCount}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-surface-muted p-4">
            <p className="text-sm text-text-muted">Supporters</p>
            <p className="mt-1 font-semibold text-heading">{supporterCount}</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-surface-muted p-4">
            <p className="text-sm text-text-muted">Raised</p>
            <p className="mt-1 font-semibold text-primary">
              {formatCurrency(campaign.raisedAmount)} /{" "}
              <span className="font-normal text-text-muted">
                {formatCurrency(campaign.targetAmount ?? campaign.goalAmount)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
