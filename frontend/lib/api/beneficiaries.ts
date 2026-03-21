import type { Beneficiary, BeneficiaryStatus } from "@/types/beneficiary";
import { requestJson } from "./http";

type ApiDecimal = string | number;

interface BackendBeneficiary {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  full_name: string;
  location: string | null;
  category: string;
  story: string | null;
  target_support_amount: ApiDecimal;
  status: BeneficiaryStatus;
  is_verified: boolean;
  created_at: string;
}

interface ListBeneficiariesOptions {
  organizationId?: string;
  campaignId?: string;
  limit?: number;
  token?: string;
}

function toNumber(value: ApiDecimal): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapBeneficiary(item: BackendBeneficiary): Beneficiary {
  return {
    id: item.id,
    fullName: item.full_name,
    location: item.location ?? "Not provided",
    campaignId: item.campaign_id ?? undefined,
    status: item.status,
    category: item.category,
    targetSupportAmount: toNumber(item.target_support_amount),
    isVerified: item.is_verified,
    createdAt: item.created_at,
  };
}

export async function listBeneficiaries({
  organizationId,
  campaignId,
  limit = 200,
  token,
}: ListBeneficiariesOptions = {}): Promise<Beneficiary[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (organizationId) {
    query.set("organization_id", organizationId);
  }
  if (campaignId) {
    query.set("campaign_id", campaignId);
  }

  const beneficiaries = await requestJson<BackendBeneficiary[]>(
    `/beneficiaries/?${query.toString()}`,
    { token }
  );

  return beneficiaries.map(mapBeneficiary);
}
