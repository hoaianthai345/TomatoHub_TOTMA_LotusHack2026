export type CheckpointType = "volunteer" | "goods";

export type CheckpointScanType = "check_in" | "check_out";
export type CheckpointScanResult = "success" | "rejected";

export interface CampaignCheckpoint {
  id: string;
  campaignId: string;
  organizationId: string;
  name: string;
  checkpointType: CheckpointType;
  description?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignCheckpointInput {
  campaignId: string;
  name: string;
  checkpointType: CheckpointType;
  description?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface UpdateCampaignCheckpointInput {
  name?: string;
  checkpointType?: CheckpointType;
  description?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface CampaignCheckpointQrCode {
  checkpointId: string;
  campaignId: string;
  scanType: CheckpointScanType;
  token: string;
  expiresAt: string;
}

export interface VolunteerAttendance {
  id: string;
  campaignId: string;
  checkpointId: string;
  registrationId: string;
  userId: string;
  checkInAt: string;
  checkOutAt?: string;
  durationMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsCheckin {
  id: string;
  campaignId: string;
  checkpointId: string;
  userId?: string;
  donorName: string;
  itemName: string;
  quantity: number;
  unit: string;
  note?: string;
  checkedInAt: string;
}

export interface CheckpointScanLog {
  id: string;
  campaignId: string;
  checkpointId: string;
  registrationId?: string;
  userId?: string;
  scanType: CheckpointScanType;
  result: CheckpointScanResult;
  message?: string;
  tokenNonce?: string;
  scannedAt: string;
}

export interface CampaignCheckpointScanResponse {
  message: string;
  scanType: CheckpointScanType;
  flowType: CheckpointType;
  attendance?: VolunteerAttendance;
  goodsCheckin?: GoodsCheckin;
}
