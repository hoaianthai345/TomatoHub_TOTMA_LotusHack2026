import type { Supporter } from "@/types/supporter";

export const supporters: Supporter[] = [
  {
    id: "sup-1",
    fullName: "Le Minh Anh",
    supportTypes: ["donor_money", "volunteer"],
    location: "District 7, HCMC",
    joinedCampaignIds: ["camp-1"],
  },
  {
    id: "sup-2",
    fullName: "Pham Quoc Huy",
    supportTypes: ["shipper"],
    location: "Thu Duc, HCMC",
    joinedCampaignIds: ["camp-1", "camp-2"],
  },
];