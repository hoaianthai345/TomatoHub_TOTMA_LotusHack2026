import type {
  Campaign,
  CampaignCoordinates,
  CampaignSupportType,
} from "@/types/campaign";
import { requestJson } from "./http";

type ApiDecimal = string | number;

interface BackendCampaign {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  support_types: CampaignSupportType[];
  goal_amount: ApiDecimal;
  raised_amount: ApiDecimal;
  province: string | null;
  district: string | null;
  address_line: string | null;
  latitude: ApiDecimal | null;
  longitude: ApiDecimal | null;
  media_urls: string[];
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  status: Campaign["status"];
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendBeneficiary {
  id: string;
}

interface BackendDonation {
  donor_user_id: string | null;
  donor_name: string;
}

interface BackendVolunteerRegistration {
  user_id: string | null;
  email: string;
}

export interface CampaignActivitySummary {
  beneficiaryCount: number;
  donationCount: number;
  volunteerRegistrationCount: number;
  supporterCount: number;
}

interface BackendPublishCampaignResponse {
  message: string;
  campaign: BackendCampaign;
}

export interface CreateCampaignInput {
  organizationId: string;
  title: string;
  shortDescription?: string;
  description?: string;
  tags?: string[];
  coverImageUrl?: string;
  supportTypes: CampaignSupportType[];
  goalAmount: number;
  province?: string;
  district?: string;
  addressLine?: string;
  mediaUrls?: string[];
  startsAt: string;
  endsAt?: string;
}

export interface UpdateCampaignInput {
  organizationId?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  tags?: string[];
  coverImageUrl?: string;
  supportTypes?: CampaignSupportType[];
  goalAmount?: number;
  province?: string;
  district?: string;
  addressLine?: string;
  mediaUrls?: string[];
  startsAt?: string;
  endsAt?: string | null;
}

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&q=80";

function toNumber(value: ApiDecimal | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildLocationLabel(campaign: Pick<BackendCampaign, "province" | "district" | "address_line">): string {
  return [campaign.address_line, campaign.district, campaign.province]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(", ");
}

function buildCoordinates(campaign: BackendCampaign): CampaignCoordinates | null {
  if (campaign.latitude === null || campaign.longitude === null) {
    return null;
  }

  return {
    latitude: toNumber(campaign.latitude),
    longitude: toNumber(campaign.longitude),
  };
}

export function mapCampaign(campaign: BackendCampaign): Campaign {
  const targetAmount = toNumber(campaign.goal_amount);
  const location = buildLocationLabel(campaign);

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    shortDescription: campaign.short_description ?? campaign.description ?? "",
    description: campaign.description ?? campaign.short_description ?? "",
    location,
    organizationId: campaign.organization_id,
    status: campaign.status,
    tags: campaign.tags ?? [],
    targetAmount,
    goalAmount: targetAmount,
    raisedAmount: toNumber(campaign.raised_amount),
    supportTypes: campaign.support_types ?? [],
    needs: [],
    coverImage:
      campaign.cover_image_url ?? campaign.media_urls?.[0] ?? DEFAULT_COVER_IMAGE,
    coverImageUrl: campaign.cover_image_url ?? undefined,
    province: campaign.province ?? undefined,
    district: campaign.district ?? undefined,
    addressLine: campaign.address_line ?? undefined,
    coordinates: buildCoordinates(campaign),
    mediaUrls: campaign.media_urls ?? [],
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at ?? undefined,
    isActive: campaign.is_active,
    publishedAt: campaign.published_at ?? undefined,
    closedAt: campaign.closed_at ?? undefined,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  };
}

export async function listPublishedCampaigns(limit = 20): Promise<Campaign[]> {
  const campaigns = await requestJson<BackendCampaign[]>(
    `/campaigns/?status=published&limit=${limit}`
  );
  return campaigns.map(mapCampaign);
}

export async function listCampaignsByOrganization(
  organizationId: string,
  {
    limit = 50,
    status,
  }: {
    limit?: number;
    status?: Campaign["status"];
  } = {}
): Promise<Campaign[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });
  if (status) {
    query.set("status", status);
  }

  const campaigns = await requestJson<BackendCampaign[]>(
    `/campaigns/by-organization/${encodeURIComponent(
      organizationId
    )}?${query.toString()}`
  );

  return campaigns.map(mapCampaign);
}

export async function getCampaignBySlug(slug: string): Promise<Campaign> {
  const campaign = await requestJson<BackendCampaign>(
    `/campaigns/slug/${encodeURIComponent(slug)}`
  );
  return mapCampaign(campaign);
}

export async function getCampaignById(campaignId: string): Promise<Campaign> {
  const campaign = await requestJson<BackendCampaign>(
    `/campaigns/${encodeURIComponent(campaignId)}`
  );
  return mapCampaign(campaign);
}

export async function getCampaignActivitySummary(
  campaignId: string
): Promise<CampaignActivitySummary> {
  const encodedId = encodeURIComponent(campaignId);
  const [beneficiaries, donations, registrations] = await Promise.all([
    requestJson<BackendBeneficiary[]>(`/beneficiaries/?campaign_id=${encodedId}`),
    requestJson<BackendDonation[]>(`/donations/?campaign_id=${encodedId}`),
    requestJson<BackendVolunteerRegistration[]>(
      `/volunteer-registrations/?campaign_id=${encodedId}`
    ),
  ]);

  const supporters = new Set<string>();

  donations.forEach((donation) => {
    supporters.add(donation.donor_user_id ?? `donor:${donation.donor_name}`);
  });
  registrations.forEach((registration) => {
    supporters.add(registration.user_id ?? `registration:${registration.email}`);
  });

  return {
    beneficiaryCount: beneficiaries.length,
    donationCount: donations.length,
    volunteerRegistrationCount: registrations.length,
    supporterCount: supporters.size,
  };
}

export async function createCampaign(
  payload: CreateCampaignInput,
  token: string
): Promise<Campaign> {
  const campaign = await requestJson<BackendCampaign>("/campaigns/", {
    method: "POST",
    token,
    body: JSON.stringify({
      organization_id: payload.organizationId,
      title: payload.title,
      short_description: payload.shortDescription || undefined,
      description: payload.description || undefined,
      tags: payload.tags ?? [],
      cover_image_url: payload.coverImageUrl || undefined,
      support_types: payload.supportTypes,
      goal_amount: payload.goalAmount,
      province: payload.province || undefined,
      district: payload.district || undefined,
      address_line: payload.addressLine || undefined,
      media_urls: payload.mediaUrls ?? [],
      starts_at: payload.startsAt,
      ends_at: payload.endsAt || undefined,
    }),
  });

  return mapCampaign(campaign);
}

export async function publishCampaign(
  campaignId: string,
  token: string
): Promise<Campaign> {
  const response = await requestJson<BackendPublishCampaignResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/publish`,
    {
      method: "POST",
      token,
    }
  );

  return mapCampaign(response.campaign);
}
export async function updateCampaign(
  campaignId: string,
  payload: UpdateCampaignInput,
  token: string
): Promise<Campaign> {
  const campaign = await requestJson<BackendCampaign>(
    `/campaigns/${encodeURIComponent(campaignId)}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        organization_id: payload.organizationId,
        title: payload.title,
        short_description: payload.shortDescription,
        description: payload.description,
        tags: payload.tags,
        cover_image_url: payload.coverImageUrl,
        support_types: payload.supportTypes,
        goal_amount: payload.goalAmount,
        province: payload.province,
        district: payload.district,
        address_line: payload.addressLine,
        media_urls: payload.mediaUrls,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt === null ? null : payload.endsAt,
      }),
    }
  );

  return mapCampaign(campaign);
}

export async function deleteCampaign(
  campaignId: string,
  token: string
): Promise<void> {
  await requestJson<{ message: string }>(`/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "DELETE",
    token,
  });
}
