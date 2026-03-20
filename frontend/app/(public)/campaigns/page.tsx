import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import CampaignCard from "@/components/campaign/campaign-card";
import NearbyCampaignMap from "@/components/campaign/nearby-campaign-map";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import type { Campaign } from "@/types/campaign";

export default async function CampaignListPage() {
  let campaigns: Campaign[] = [];

  try {
    campaigns = await listPublishedCampaigns();
  } catch {
    campaigns = [];
  }

  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Campaign List"
          description="Public campaign browsing page for supporters."
        />

        {campaigns.some((campaign) => campaign.coordinates !== null) ? (
          <div className="mb-8">
            <NearbyCampaignMap campaigns={campaigns} />
          </div>
        ) : null}

        {campaigns.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="card-base p-6 text-sm text-text-muted">
            No published campaigns are available from the backend right now.
          </div>
        )}
      </Container>
    </div>
  );
}
