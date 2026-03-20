import type { Campaign } from "@/types/campaign";
import { formatCurrency } from "@/utils/format";

interface CampaignDetailHeroProps {
  campaign: Campaign;
}

export default function CampaignDetailHero({
  campaign,
}: CampaignDetailHeroProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div
        className="h-64 w-full bg-cover bg-center md:h-80"
        style={{ backgroundImage: `url(${campaign.coverImage})` }}
      />
      <div className="p-6 md:p-8">
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

        <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
        <p className="mt-3 max-w-3xl text-gray-600">{campaign.description}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Location</p>
            <p className="mt-1 font-semibold text-gray-900">{campaign.location}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Beneficiaries</p>
            <p className="mt-1 font-semibold text-gray-900">
              {campaign.beneficiaryCount}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Supporters</p>
            <p className="mt-1 font-semibold text-gray-900">
              {campaign.supporterCount}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Raised</p>
            <p className="mt-1 font-semibold text-gray-900">
              {formatCurrency(campaign.raisedAmount)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}