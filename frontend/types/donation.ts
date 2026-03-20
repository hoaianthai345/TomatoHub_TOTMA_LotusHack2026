export interface Donation {
  id: string;
  campaignId: string;
  supporterId: string;
  type: "money" | "goods";
  amount?: number;
  itemName?: string;
  quantity?: number;
  createdAt: string;
}