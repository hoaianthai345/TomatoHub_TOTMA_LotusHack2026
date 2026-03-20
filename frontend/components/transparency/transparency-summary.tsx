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
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-gray-900">{log.title}</h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {log.type}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{log.description}</p>
          <p className="mt-3 text-xs text-gray-400">{log.createdAt}</p>
        </div>
      ))}
    </div>
  );
}