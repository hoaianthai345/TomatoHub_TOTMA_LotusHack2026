import {
  CircleCheck,
  CircleDot,
  CircleX,
  Clock3,
  Info,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { StatusKind, StatusMeta, StatusTone } from "@/types/ui-status";

const STATUS_META_MAP: Record<StatusKind, Record<string, StatusMeta>> = {
  campaign_phase: {
    upcoming: { label: "Upcoming", tone: "warning", icon: Clock3 },
    live: { label: "Live", tone: "success", icon: CircleCheck },
    ended: { label: "Ended", tone: "neutral", icon: CircleDot },
  },
  campaign_status: {
    draft: { label: "Draft", tone: "neutral", icon: CircleDot },
    published: { label: "Published", tone: "success", icon: CircleCheck },
    closed: { label: "Closed", tone: "danger", icon: CircleX },
  },
  registration_status: {
    pending: { label: "Pending", tone: "warning", icon: Clock3 },
    approved: { label: "Approved", tone: "success", icon: CircleCheck },
    rejected: { label: "Rejected", tone: "danger", icon: CircleX },
    cancelled: { label: "Cancelled", tone: "neutral", icon: CircleDot },
  },
  attendance_status: {
    not_marked: { label: "Not marked", tone: "neutral", icon: CircleDot },
    arrived: { label: "Arrived", tone: "info", icon: Info },
    absent: { label: "Absent", tone: "danger", icon: CircleX },
    left_early: { label: "Left early", tone: "warning", icon: TriangleAlert },
    completed: { label: "Completed", tone: "success", icon: CircleCheck },
  },
  beneficiary_status: {
    added: { label: "Added", tone: "neutral", icon: CircleDot },
    verified: { label: "Verified", tone: "info", icon: Info },
    assigned: { label: "Assigned", tone: "warning", icon: Clock3 },
    received: { label: "Received", tone: "success", icon: CircleCheck },
  },
  checkpoint_result: {
    success: { label: "Success", tone: "success", icon: CircleCheck },
    rejected: { label: "Rejected", tone: "danger", icon: CircleX },
  },
  verified_state: {
    verified: { label: "Verified", tone: "success", icon: ShieldCheck },
    unverified: { label: "Unverified", tone: "neutral", icon: CircleDot },
    true: { label: "Verified", tone: "success", icon: ShieldCheck },
    false: { label: "Unverified", tone: "neutral", icon: CircleDot },
  },
};

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  success: "border border-success/30 bg-success/10 text-success",
  warning: "border border-warning/30 bg-warning/10 text-warning",
  danger: "border border-danger/30 bg-danger/10 text-danger",
  info: "border border-info/30 bg-info/10 text-info",
  neutral: "border border-border bg-surface-muted text-text-muted",
};

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getStatusMeta(kind: StatusKind, value: string): StatusMeta {
  const normalizedValue = value.trim().toLowerCase();
  const found = STATUS_META_MAP[kind][normalizedValue];
  if (found) {
    return found;
  }

  return {
    label: formatFallbackLabel(value),
    tone: "neutral",
    icon: CircleDot,
    srLabel: `Status ${formatFallbackLabel(value)}`,
  };
}
