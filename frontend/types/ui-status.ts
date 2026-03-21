import type { LucideIcon } from "lucide-react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type StatusKind =
  | "campaign_phase"
  | "campaign_status"
  | "registration_status"
  | "attendance_status"
  | "beneficiary_status"
  | "checkpoint_result"
  | "verified_state";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
  srLabel?: string;
}
