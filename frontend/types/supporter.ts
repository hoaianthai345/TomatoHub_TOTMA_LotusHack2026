import type { SupportType } from "./campaign";

export interface Supporter {
  id: string;
  fullName: string;
  supportTypes: SupportType[];
  location: string;
  joinedCampaignIds: string[];
}