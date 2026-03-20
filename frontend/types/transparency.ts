export interface TransparencyLog {
  id: string;
  campaignId: string;
  type: "summary" | "ledger" | "distribution" | "evidence";
  title: string;
  description: string;
  createdAt: string;
}	