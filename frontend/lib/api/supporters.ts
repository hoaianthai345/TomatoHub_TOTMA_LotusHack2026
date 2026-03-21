import type { Supporter } from "@/types/supporter";
import type { SupportType } from "@/types/user";
import { requestJson } from "./http";

interface BackendSupporter {
  id: string;
  full_name: string;
  email: string;
  location: string | null;
  support_types: SupportType[];
  joined_campaign_ids: string[];
}

interface ListSupportersOptions {
  organizationId?: string;
  limit?: number;
  token?: string;
}

function mapSupporter(item: BackendSupporter): Supporter {
  return {
    id: item.id,
    fullName: item.full_name,
    email: item.email,
    location: item.location ?? undefined,
    supportTypes: item.support_types ?? [],
    joinedCampaignIds: item.joined_campaign_ids ?? [],
  };
}

export async function listSupporters({
  organizationId,
  limit = 200,
  token,
}: ListSupportersOptions = {}): Promise<Supporter[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (organizationId) {
    query.set("organization_id", organizationId);
  }

  const supporters = await requestJson<BackendSupporter[]>(
    `/supporters/?${query.toString()}`,
    { token }
  );

  return supporters.map(mapSupporter);
}
