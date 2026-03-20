import type { TransparencyLog } from "@/types/transparency";

interface TransparencySummaryProps {
  logs: TransparencyLog[];
}

export default function TransparencySummary({
  logs,
}: TransparencySummaryProps) {
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
          <p className="mt-3 text-xs text-text-muted/60">{log.createdAt}</p>
        </div>
      ))}
    </div>
  );
}