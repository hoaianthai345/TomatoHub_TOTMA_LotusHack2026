import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleOff,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

type StatePanelVariant =
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "info"
  | "warning";

interface StatePanelProps {
  variant: StatePanelVariant;
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<StatePanelVariant, string> = {
  loading: "state-panel-info",
  empty: "state-panel-neutral",
  error: "state-panel-error",
  success: "state-panel-success",
  info: "state-panel-info",
  warning: "state-panel-warning",
};

const VARIANT_ICON: Record<StatePanelVariant, typeof CircleHelp> = {
  loading: LoaderCircle,
  empty: CircleOff,
  error: CircleAlert,
  success: CircleCheck,
  info: CircleHelp,
  warning: TriangleAlert,
};

export default function StatePanel({
  variant,
  title,
  message,
  action,
  className = "",
}: StatePanelProps) {
  const Icon = VARIANT_ICON[variant];
  const iconClassName = variant === "loading" ? "animate-spin" : "";

  return (
    <div
      className={`state-panel ${VARIANT_CLASS[variant]} ${className}`.trim()}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="flex items-start gap-2.5">
        <Icon className={`icon-16 mt-0.5 shrink-0 ${iconClassName}`.trim()} aria-hidden="true" />
        <div className="min-w-0">
          {title ? <p className="font-semibold">{title}</p> : null}
          <p>{message}</p>
          {action ? <div className="mt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
