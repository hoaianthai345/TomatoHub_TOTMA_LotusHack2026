import type { Donation } from "@/types/donation";

export const donations: Donation[] = [
  {
    id: "don-1",
    campaignId: "camp-1",
    donorUserId: "sup-1",
    donorName: "Mai Giang",
    amount: 500000,
    currency: "VND",
    paymentMethod: "bank_transfer",
    createdAt: "2026-03-20T10:30:00Z",
  },
  {
    id: "don-2",
    campaignId: "camp-2",
    donorUserId: "sup-2",
    donorName: "Nguyen Tuan",
    amount: 0,
    currency: "VND",
    paymentMethod: "goods_dropoff",
    note: "Notebooks x100",
    createdAt: "2026-03-20T14:00:00Z",
  },
];
