export interface Donation {
  id: string;
  campaignId: string;
  donorUserId?: string;
  donorName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  note?: string;
  createdAt: string;
}
