import type { SupportType } from "./user";

export interface Supporter {
  id: string;
  fullName: string;
  email?: string;
  supportTypes: SupportType[];
  location?: string;
  joinedCampaignIds: string[];
}
