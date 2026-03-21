import type { TransparencyLog } from "@/types/transparency";
import { requestJson } from "./http";

interface BackendTransparencyLog {
  id: string;
  campaign_id: string;
  type: TransparencyLog["type"];
  title: string;
  description: string;
  created_at: string;
}

interface ListTransparencyLogsOptions {
  campaignId?: string;
  organizationId?: string;
  limit?: number;
  token?: string;
}

function mapTransparencyLog(item: BackendTransparencyLog): TransparencyLog {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    type: item.type,
    title: item.title,
    description: item.description,
    createdAt: item.created_at,
  };
}

export async function listTransparencyLogs({
  campaignId,
  organizationId,
  limit = 100,
  token,
}: ListTransparencyLogsOptions = {}): Promise<TransparencyLog[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (campaignId) {
    query.set("campaign_id", campaignId);
  }
  if (organizationId) {
    query.set("organization_id", organizationId);
  }

  const logs = await requestJson<BackendTransparencyLog[]>(
    `/transparency/logs?${query.toString()}`,
    { token }
  );

  return logs.map(mapTransparencyLog);
}
