import type { Donation } from "@/types/donation";

export const donations: Donation[] = [
  {
    id: "don-1",
    campaignId: "camp-1",
    supporterId: "sup-1",
    type: "money",
    amount: 500000,
    createdAt: "2026-03-20T10:30:00Z",
  },
  {
    id: "don-2",
    campaignId: "camp-2",
    supporterId: "sup-2",
    type: "goods",
    itemName: "Notebooks",
    quantity: 100,
    createdAt: "2026-03-20T14:00:00Z",
  },
];