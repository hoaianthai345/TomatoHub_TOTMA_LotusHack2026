import type { TransparencyLog } from "@/types/transparency";
import { formatDateTime } from "@/utils/format";

interface TransparencySummaryProps {
  logs: TransparencyLog[];
}

export default function TransparencySummary({
  logs,
}: TransparencySummaryProps) {
  if (logs.length === 0) {
    return (
      <div className="card-base p-5 text-sm text-text-muted">
        No transparency logs found for this organization yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="card-base p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-heading">{log.title}</h3>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted border border-border">
              {log.type}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted">{log.description}</p>
          <p className="mt-3 text-xs text-text-muted/60">{formatDateTime(log.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}
