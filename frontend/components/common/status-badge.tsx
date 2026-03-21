import type { StatusKind } from "@/types/ui-status";
import { getStatusMeta, STATUS_TONE_CLASS } from "@/lib/ui/status";

interface StatusBadgeProps {
  kind: StatusKind;
  value: string;
  size?: 14 | 16 | 18 | 20;
  showIcon?: boolean;
  className?: string;
}

export default function StatusBadge({
  kind,
  value,
  size = 16,
  showIcon = true,
  className = "",
}: StatusBadgeProps) {
  const meta = getStatusMeta(kind, value);
  const Icon = meta.icon;

  return (
    <span
      className={`badge-base text-xs ${STATUS_TONE_CLASS[meta.tone]} ${className}`.trim()}
      aria-label={meta.srLabel ?? meta.label}
    >
      {showIcon ? (
        <Icon
          aria-hidden="true"
          style={{ width: `${size}px`, height: `${size}px` }}
          strokeWidth={2.1}
        />
      ) : null}
      <span>{meta.label}</span>
    </span>
  );
}
