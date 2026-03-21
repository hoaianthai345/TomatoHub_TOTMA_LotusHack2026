import Container from "@/components/common/container";
import CampaignBrowser from "@/components/campaign/campaign-browser";
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
    <div className="py-8 md:py-10">
      <Container>
        <CampaignBrowser campaigns={campaigns} />
      </Container>
    </div>
  );
}
