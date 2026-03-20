import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import CampaignCard from "@/components/campaign/campaign-card";
import NearbyCampaignMap from "@/components/campaign/nearby-campaign-map";
import { campaigns } from "@/mocks/campaigns";

export default function CampaignListPage() {
  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Campaign List"
          description="Public campaign browsing page for supporters."
        />

        <div className="mb-8">
          <NearbyCampaignMap campaigns={campaigns} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </Container>
    </div>
  );
}
