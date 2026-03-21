import type {
  Campaign,
  CampaignCoordinates,
  CampaignSupportType,
} from "@/types/campaign";
import type {
  CampaignVolunteerParticipant,
  VolunteerAttendanceStatus,
  VolunteerRole,
} from "@/types/volunteer-registration";
import { getCampaignPhase } from "@/lib/campaign-phase";
import { requestJson, resolveApiAssetUrl } from "./http";

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

interface BackendCampaignVolunteerParticipant {
  full_name: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  role: VolunteerRole | null;
  shift_start_at: string | null;
  shift_end_at: string | null;
  attendance_status: VolunteerAttendanceStatus;
  registered_at: string;
}

export interface CampaignActivitySummary {
  beneficiaryCount: number;
  donationCount: number;
  volunteerRegistrationCount: number;
  supporterCount: number;
}

interface ListCampaignsOptions {
  limit?: number;
  status?: Campaign["status"];
  organizationId?: string;
  province?: string;
  district?: string;
  supportType?: CampaignSupportType;
  token?: string;
}

interface ListPublishedCampaignsOptions {
  limit?: number;
  organizationId?: string;
  province?: string;
  district?: string;
  supportType?: CampaignSupportType;
}

const CAMPAIGN_LIST_LIMIT_DEFAULT = 20;
const CAMPAIGN_LIST_LIMIT_MIN = 1;
const CAMPAIGN_LIST_LIMIT_MAX = 100;

interface BackendPublishCampaignResponse {
  message: string;
  campaign: BackendCampaign;
}

interface BackendCloseCampaignResponse {
  message: string;
  campaign: BackendCampaign;
}

interface BackendReopenCampaignResponse {
  message: string;
  campaign: BackendCampaign;
}

interface BackendCampaignImage {
  id: string;
  campaign_id: string;
  uploaded_by_user_id: string | null;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  relative_path: string;
  file_url: string;
  created_at: string;
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

export const DEFAULT_CAMPAIGN_COVER_IMAGE = "/images/campaigns/default-cover.jpg";

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
  const phase = getCampaignPhase({
    status: campaign.status,
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at ?? undefined,
    isActive: campaign.is_active,
  });
  const mediaUrls = (campaign.media_urls ?? [])
    .map((value) => resolveApiAssetUrl(value) ?? value)
    .filter(Boolean);
  const coverImageUrl =
    resolveApiAssetUrl(campaign.cover_image_url) ??
    mediaUrls[0] ??
    undefined;

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    shortDescription: campaign.short_description ?? campaign.description ?? "",
    description: campaign.description ?? campaign.short_description ?? "",
    location,
    organizationId: campaign.organization_id,
    status: campaign.status,
    phase,
    tags: campaign.tags ?? [],
    targetAmount,
    goalAmount: targetAmount,
    raisedAmount: toNumber(campaign.raised_amount),
    supportTypes: campaign.support_types ?? [],
    needs: [],
    coverImage: coverImageUrl ?? DEFAULT_CAMPAIGN_COVER_IMAGE,
    coverImageUrl,
    province: campaign.province ?? undefined,
    district: campaign.district ?? undefined,
    addressLine: campaign.address_line ?? undefined,
    coordinates: buildCoordinates(campaign),
    mediaUrls,
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at ?? undefined,
    isActive: campaign.is_active,
    publishedAt: campaign.published_at ?? undefined,
    closedAt: campaign.closed_at ?? undefined,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  };
}

function normalizeCampaignListLimit(limit?: number): number {
  const requestedLimit = limit ?? CAMPAIGN_LIST_LIMIT_DEFAULT;

  return Number.isFinite(requestedLimit)
    ? Math.min(
        CAMPAIGN_LIST_LIMIT_MAX,
        Math.max(CAMPAIGN_LIST_LIMIT_MIN, Math.trunc(requestedLimit))
      )
    : CAMPAIGN_LIST_LIMIT_DEFAULT;
}

export async function listCampaigns({
  limit,
  status = "published",
  organizationId,
  province,
  district,
  supportType,
  token,
}: ListCampaignsOptions = {}): Promise<Campaign[]> {
  const query = new URLSearchParams({
    status,
    limit: String(normalizeCampaignListLimit(limit)),
  });

  if (organizationId) {
    query.set("organization_id", organizationId);
  }
  if (province?.trim()) {
    query.set("province", province.trim());
  }
  if (district?.trim()) {
    query.set("district", district.trim());
  }
  if (supportType) {
    query.set("support_type", supportType);
  }

  const campaigns = await requestJson<BackendCampaign[]>(
    `/campaigns/?${query.toString()}`,
    { token }
  );

  return campaigns.map(mapCampaign);
}

export async function listPublishedCampaigns(
  limitOrOptions: number | ListPublishedCampaignsOptions = CAMPAIGN_LIST_LIMIT_DEFAULT,
  options: ListPublishedCampaignsOptions = {}
): Promise<Campaign[]> {
  const resolvedOptions =
    typeof limitOrOptions === "number"
      ? { ...options, limit: limitOrOptions }
      : limitOrOptions;

  return listCampaigns({
    status: "published",
    limit: resolvedOptions.limit,
    organizationId: resolvedOptions.organizationId,
    province: resolvedOptions.province,
    district: resolvedOptions.district,
    supportType: resolvedOptions.supportType,
  });
}

export async function listCampaignsByOrganization(
  organizationId: string,
  {
    limit = 50,
    status,
    token,
  }: {
    limit?: number;
    status?: Campaign["status"];
    token?: string;
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
    )}?${query.toString()}`,
    { token }
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

export async function listCampaignVolunteerParticipants(
  campaignId: string,
  limit: number = 200,
  options: {
    includePending?: boolean;
  } = {}
): Promise<CampaignVolunteerParticipant[]> {
  const query = new URLSearchParams({
    limit: String(limit),
    include_pending: options.includePending === false ? "false" : "true",
  });
  const participants = await requestJson<BackendCampaignVolunteerParticipant[]>(
    `/campaigns/${encodeURIComponent(campaignId)}/volunteers?${query.toString()}`
  );

  return participants.map((item) => ({
    fullName: item.full_name,
    registrationStatus: item.status,
    role: item.role ?? undefined,
    shiftStartAt: item.shift_start_at ?? undefined,
    shiftEndAt: item.shift_end_at ?? undefined,
    attendanceStatus: item.attendance_status ?? "not_marked",
    registeredAt: item.registered_at,
  }));
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

export async function closeCampaign(
  campaignId: string,
  token: string,
  options: {
    closedAt?: string;
  } = {}
): Promise<Campaign> {
  const response = await requestJson<BackendCloseCampaignResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/close`,
    {
      method: "POST",
      token,
      body:
        options.closedAt === undefined
          ? undefined
          : JSON.stringify({ closed_at: options.closedAt }),
    }
  );

  return mapCampaign(response.campaign);
}

export async function reopenCampaign(
  campaignId: string,
  token: string
): Promise<Campaign> {
  const response = await requestJson<BackendReopenCampaignResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/reopen`,
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

export async function uploadCampaignImage(
  campaignId: string,
  file: File,
  token: string,
  options: { setAsCover?: boolean } = {}
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  if (options.setAsCover !== undefined) {
    formData.append("set_as_cover", options.setAsCover ? "true" : "false");
  }

  await requestJson<BackendCampaignImage>(
    `/campaigns/${encodeURIComponent(campaignId)}/images`,
    {
      method: "POST",
      token,
      body: formData,
    }
  );
}
