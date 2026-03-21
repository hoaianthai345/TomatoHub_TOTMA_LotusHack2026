import { requestJson } from "./http";
import type {
  CampaignCheckpoint,
  CampaignCheckpointScanResponse,
  CheckpointScanType,
  GoodsCheckin,
  VolunteerAttendance,
} from "@/types/checkpoint";

type ApiDecimal = string | number;

interface BackendCampaignCheckpoint {
  id: string;
  campaign_id: string;
  organization_id: string;
  name: string;
  checkpoint_type: CampaignCheckpoint["checkpointType"];
  description: string | null;
  address_line: string | null;
  latitude: ApiDecimal | null;
  longitude: ApiDecimal | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BackendVolunteerAttendance {
  id: string;
  campaign_id: string;
  checkpoint_id: string;
  registration_id: string;
  user_id: string;
  check_in_at: string;
  check_out_at: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface BackendGoodsCheckin {
  id: string;
  campaign_id: string;
  checkpoint_id: string;
  user_id: string | null;
  donor_name: string;
  item_name: string;
  quantity: ApiDecimal;
  unit: string;
  note: string | null;
  checked_in_at: string;
}

interface BackendCampaignCheckpointScanResponse {
  message: string;
  scan_type: CheckpointScanType;
  flow_type: CampaignCheckpoint["checkpointType"];
  attendance: BackendVolunteerAttendance | null;
  goods_checkin: BackendGoodsCheckin | null;
}

interface ScanCheckpointInput {
  token: string;
  donorName?: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

function toNumber(value: ApiDecimal | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCheckpoint(item: BackendCampaignCheckpoint): CampaignCheckpoint {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    organizationId: item.organization_id,
    name: item.name,
    checkpointType: item.checkpoint_type,
    description: item.description ?? undefined,
    addressLine: item.address_line ?? undefined,
    latitude: item.latitude === null ? undefined : toNumber(item.latitude),
    longitude: item.longitude === null ? undefined : toNumber(item.longitude),
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapAttendance(item: BackendVolunteerAttendance): VolunteerAttendance {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    checkpointId: item.checkpoint_id,
    registrationId: item.registration_id,
    userId: item.user_id,
    checkInAt: item.check_in_at,
    checkOutAt: item.check_out_at ?? undefined,
    durationMinutes: item.duration_minutes ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapGoodsCheckin(item: BackendGoodsCheckin): GoodsCheckin {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    checkpointId: item.checkpoint_id,
    userId: item.user_id ?? undefined,
    donorName: item.donor_name,
    itemName: item.item_name,
    quantity: toNumber(item.quantity),
    unit: item.unit,
    note: item.note ?? undefined,
    checkedInAt: item.checked_in_at,
  };
}

export async function listCampaignCheckpoints(
  campaignId: string
): Promise<CampaignCheckpoint[]> {
  const checkpoints = await requestJson<BackendCampaignCheckpoint[]>(
    `/campaign-checkpoints/?campaign_id=${encodeURIComponent(campaignId)}`
  );
  return checkpoints.map(mapCheckpoint);
}

export async function scanCampaignCheckpoint(
  payload: ScanCheckpointInput,
  token: string
): Promise<CampaignCheckpointScanResponse> {
  const response = await requestJson<BackendCampaignCheckpointScanResponse>(
    "/campaign-checkpoints/scan",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        token: payload.token,
        donor_name: payload.donorName,
        item_name: payload.itemName,
        quantity: payload.quantity,
        unit: payload.unit,
        note: payload.note,
      }),
    }
  );

  return {
    message: response.message,
    scanType: response.scan_type,
    flowType: response.flow_type,
    attendance: response.attendance ? mapAttendance(response.attendance) : undefined,
    goodsCheckin: response.goods_checkin
      ? mapGoodsCheckin(response.goods_checkin)
      : undefined,
  };
}

export async function listMyAttendance(
  token: string
): Promise<VolunteerAttendance[]> {
  const attendances = await requestJson<BackendVolunteerAttendance[]>(
    "/campaign-checkpoints/my-attendance",
    { token }
  );
  return attendances.map(mapAttendance);
}
