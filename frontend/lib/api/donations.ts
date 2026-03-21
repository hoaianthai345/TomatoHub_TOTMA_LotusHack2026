import type { Donation } from "@/types/donation";
import { requestJson } from "./http";

type ApiDecimal = string | number;

interface BackendDonation {
  id: string;
  campaign_id: string;
  donor_user_id: string | null;
  donor_name: string;
  amount: ApiDecimal;
  currency: string;
  payment_method: string;
  note: string | null;
  donated_at: string;
}

interface ListDonationsOptions {
  campaignId?: string;
  organizationId?: string;
  donorUserId?: string;
  limit?: number;
  token?: string;
}

interface CreateDonationInput {
  campaignId: string;
  donorName: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  note?: string;
  donorUserId?: string;
}

function toNumber(value: ApiDecimal): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapDonation(item: BackendDonation): Donation {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    donorUserId: item.donor_user_id ?? undefined,
    donorName: item.donor_name,
    amount: toNumber(item.amount),
    currency: item.currency,
    paymentMethod: item.payment_method,
    note: item.note ?? undefined,
    createdAt: item.donated_at,
  };
}

export async function listDonations({
  campaignId,
  organizationId,
  donorUserId,
  limit = 200,
  token,
}: ListDonationsOptions = {}): Promise<Donation[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (campaignId) {
    query.set("campaign_id", campaignId);
  }
  if (organizationId) {
    query.set("organization_id", organizationId);
  }
  if (donorUserId) {
    query.set("donor_user_id", donorUserId);
  }

  const donations = await requestJson<BackendDonation[]>(
    `/donations/?${query.toString()}`,
    { token }
  );

  return donations.map(mapDonation);
}

export async function createDonation(
  payload: CreateDonationInput,
  token?: string
): Promise<Donation> {
  const donation = await requestJson<BackendDonation>("/donations/", {
    method: "POST",
    token,
    body: JSON.stringify({
      campaign_id: payload.campaignId,
      donor_user_id: payload.donorUserId,
      donor_name: payload.donorName,
      amount: payload.amount,
      currency: payload.currency ?? "VND",
      payment_method: payload.paymentMethod ?? "bank_transfer",
      note: payload.note,
    }),
  });

  return mapDonation(donation);
}
