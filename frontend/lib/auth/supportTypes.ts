import type { SupportType } from "@/types/user";

export const SUPPORT_TYPE_OPTIONS: Array<{ value: SupportType; label: string }> = [
  { value: "donor_money", label: "Donate Money" },
  { value: "donor_goods", label: "Donate Goods" },
  { value: "volunteer", label: "Volunteer" },
  { value: "shipper", label: "Shipper" },
  { value: "coordinator", label: "Coordinator" },
];

const SUPPORT_TYPE_LABELS: Record<SupportType, string> = Object.fromEntries(
  SUPPORT_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<SupportType, string>;

export function getSupportTypeLabel(type: SupportType): string {
  return SUPPORT_TYPE_LABELS[type] ?? type;
}
