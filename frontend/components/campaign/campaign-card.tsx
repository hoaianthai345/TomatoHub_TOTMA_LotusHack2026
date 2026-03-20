import Link from "next/link";
import type { Campaign } from "@/types/campaign";
import { formatCurrency } from "@/utils/format";

interface CampaignCardProps {
  campaign: Campaign;
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="h-48 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${campaign.coverImage})` }}
      />

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {campaign.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
        <p className="mt-2 text-sm text-gray-600">{campaign.shortDescription}</p>

        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <p>Location: {campaign.location}</p>
          <p>Beneficiaries: {campaign.beneficiaryCount}</p>
          <p>Supporters: {campaign.supporterCount}</p>
          <p>
            Raised: {formatCurrency(campaign.raisedAmount)} /{" "}
            {formatCurrency(campaign.targetAmount)}
          </p>
        </div>

        <Link
          href={`/campaigns/${campaign.slug}`}
          className="mt-5 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          View details
        </Link>
      </div>
    </article>
  );
}