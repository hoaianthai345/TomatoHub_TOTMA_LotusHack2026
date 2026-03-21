import { requestJson } from "./http";
import type {
  CampaignCheckpoint,
  CampaignCheckpointQrCode,
  CampaignCheckpointScanResponse,
  CheckpointScanLog,
  CheckpointScanType,
  CreateCampaignCheckpointInput,
  GoodsCheckin,
  UpdateCampaignCheckpointInput,
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

interface BackendCampaignCheckpointQrCode {
  checkpoint_id: string;
  campaign_id: string;
  scan_type: CheckpointScanType;
  token: string;
  expires_at: string;
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

interface BackendCheckpointScanLog {
  id: string;
  campaign_id: string;
  checkpoint_id: string;
  registration_id: string | null;
  user_id: string | null;
  scan_type: CheckpointScanType;
  result: CheckpointScanLog["result"];
  message: string | null;
  token_nonce: string | null;
  scanned_at: string;
}

interface BackendCampaignCheckpointScanResponse {
  message: string;
  scan_type: CheckpointScanType;
  flow_type: CampaignCheckpoint["checkpointType"];
  attendance: BackendVolunteerAttendance | null;
  goods_checkin: BackendGoodsCheckin | null;
}

export interface ScanCheckpointInput {
  token: string;
  donorName?: string;
  itemName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

interface ListCheckpointOptions {
  includeInactive?: boolean;
  limit?: number;
  token?: string;
}

interface ListGoodsCheckinsForOrganizationOptions {
  campaignId?: string;
  checkpointId?: string;
  userId?: string;
  limit?: number;
  token: string;
}

interface ListMyGoodsCheckinsOptions {
  campaignId?: string;
  limit?: number;
}

interface ListMyAttendanceOptions {
  campaignId?: string;
  limit?: number;
}

interface GenerateCheckpointQrInput {
  scanType: CheckpointScanType;
  expiresInMinutes?: number;
}

interface ManualVolunteerAttendanceInput {
  registrationId: string;
  scanType: CheckpointScanType;
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

function mapCheckpointQrCode(
  item: BackendCampaignCheckpointQrCode
): CampaignCheckpointQrCode {
  return {
    checkpointId: item.checkpoint_id,
    campaignId: item.campaign_id,
    scanType: item.scan_type,
    token: item.token,
    expiresAt: item.expires_at,
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

function mapCheckpointScanLog(item: BackendCheckpointScanLog): CheckpointScanLog {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    checkpointId: item.checkpoint_id,
    registrationId: item.registration_id ?? undefined,
    userId: item.user_id ?? undefined,
    scanType: item.scan_type,
    result: item.result,
    message: item.message ?? undefined,
    tokenNonce: item.token_nonce ?? undefined,
    scannedAt: item.scanned_at,
  };
}

export async function listCampaignCheckpoints(
  campaignId: string,
  {
    includeInactive = false,
    limit = 100,
    token,
  }: ListCheckpointOptions = {}
): Promise<CampaignCheckpoint[]> {
  const query = new URLSearchParams({
    campaign_id: campaignId,
    include_inactive: includeInactive ? "true" : "false",
    limit: String(limit),
  });

  const checkpoints = await requestJson<BackendCampaignCheckpoint[]>(
    `/campaign-checkpoints/?${query.toString()}`,
    { token }
  );

  return checkpoints.map(mapCheckpoint);
}

export async function createCampaignCheckpoint(
  payload: CreateCampaignCheckpointInput,
  token: string
): Promise<CampaignCheckpoint> {
  const checkpoint = await requestJson<BackendCampaignCheckpoint>(
    "/campaign-checkpoints/",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        campaign_id: payload.campaignId,
        name: payload.name,
        checkpoint_type: payload.checkpointType,
        description: payload.description,
        address_line: payload.addressLine,
        latitude: payload.latitude,
        longitude: payload.longitude,
        is_active: payload.isActive ?? true,
      }),
    }
  );

  return mapCheckpoint(checkpoint);
}

export async function updateCampaignCheckpoint(
  checkpointId: string,
  payload: UpdateCampaignCheckpointInput,
  token: string
): Promise<CampaignCheckpoint> {
  const checkpoint = await requestJson<BackendCampaignCheckpoint>(
    `/campaign-checkpoints/${encodeURIComponent(checkpointId)}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        name: payload.name,
        checkpoint_type: payload.checkpointType,
        description: payload.description,
        address_line: payload.addressLine,
        latitude: payload.latitude,
        longitude: payload.longitude,
        is_active: payload.isActive,
      }),
    }
  );

  return mapCheckpoint(checkpoint);
}

export async function deleteCampaignCheckpoint(
  checkpointId: string,
  token: string
): Promise<void> {
  await requestJson<{ message: string }>(
    `/campaign-checkpoints/${encodeURIComponent(checkpointId)}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function generateCheckpointQrCode(
  checkpointId: string,
  payload: GenerateCheckpointQrInput,
  token: string
): Promise<CampaignCheckpointQrCode> {
  const qrCode = await requestJson<BackendCampaignCheckpointQrCode>(
    `/campaign-checkpoints/${encodeURIComponent(checkpointId)}/qr`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        scan_type: payload.scanType,
        expires_in_minutes: payload.expiresInMinutes,
      }),
    }
  );

  return mapCheckpointQrCode(qrCode);
}

export async function listGoodsCheckinsForOrganization({
  campaignId,
  checkpointId,
  userId,
  limit = 200,
  token,
}: ListGoodsCheckinsForOrganizationOptions): Promise<GoodsCheckin[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (campaignId) {
    query.set("campaign_id", campaignId);
  }
  if (checkpointId) {
    query.set("checkpoint_id", checkpointId);
  }
  if (userId) {
    query.set("user_id", userId);
  }

  const goodsCheckins = await requestJson<BackendGoodsCheckin[]>(
    `/campaign-checkpoints/goods-checkins?${query.toString()}`,
    { token }
  );

  return goodsCheckins.map(mapGoodsCheckin);
}

export async function listMyGoodsCheckins(
  token: string,
  { campaignId, limit = 200 }: ListMyGoodsCheckinsOptions = {}
): Promise<GoodsCheckin[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (campaignId) {
    query.set("campaign_id", campaignId);
  }

  const goodsCheckins = await requestJson<BackendGoodsCheckin[]>(
    `/campaign-checkpoints/my-goods-checkins?${query.toString()}`,
    { token }
  );

  return goodsCheckins.map(mapGoodsCheckin);
}

export async function listMyAttendance(
  token: string,
  { campaignId, limit = 100 }: ListMyAttendanceOptions = {}
): Promise<VolunteerAttendance[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (campaignId) {
    query.set("campaign_id", campaignId);
  }

  const attendances = await requestJson<BackendVolunteerAttendance[]>(
    `/campaign-checkpoints/my-attendance?${query.toString()}`,
    { token }
  );

  return attendances.map(mapAttendance);
}

export async function listCheckpointScanLogs(
  checkpointId: string,
  token: string,
  limit: number = 200
): Promise<CheckpointScanLog[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  const logs = await requestJson<BackendCheckpointScanLog[]>(
    `/campaign-checkpoints/${encodeURIComponent(checkpointId)}/logs?${query.toString()}`,
    { token }
  );

  return logs.map(mapCheckpointScanLog);
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

export async function manualVolunteerAttendance(
  checkpointId: string,
  payload: ManualVolunteerAttendanceInput,
  token: string
): Promise<CampaignCheckpointScanResponse> {
  const response = await requestJson<BackendCampaignCheckpointScanResponse>(
    `/campaign-checkpoints/${encodeURIComponent(checkpointId)}/manual-attendance`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        registration_id: payload.registrationId,
        scan_type: payload.scanType,
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
