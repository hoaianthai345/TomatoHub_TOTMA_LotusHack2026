import type { TransparencyLog } from "@/types/transparency";

export const transparencyLogs: TransparencyLog[] = [
  {
    id: "log-1",
    campaignId: "camp-1",
    type: "summary",
    title: "Campaign Summary Updated",
    description: "Support progress and current needs were updated for public view.",
    createdAt: "2026-03-20T15:00:00Z",
  },
  {
    id: "log-2",
    campaignId: "camp-1",
    type: "ledger",
    title: "Donation Ledger Published",
    description: "Current donation records were published to the transparency page.",
    createdAt: "2026-03-20T16:30:00Z",
  },
];