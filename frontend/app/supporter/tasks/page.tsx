"use client";

import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { getSupporterTasks } from "@/mocks/dashboard-experience";

export default function TasksPage() {
  const { currentUser } = useAuth();
  const items = getSupporterTasks(currentUser?.id);

  return (
    <RoleGate role="supporter" loadingMessage="Loading tasks...">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-heading">My Tasks</h1>
          <p className="mt-2 text-body">
            Sample assigned work so the supporter flow can be designed before task endpoints are ready.
          </p>
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="card-base rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-heading">{item.title}</h2>
                  <p className="mt-1 text-sm text-text-muted">{item.campaignTitle}</p>
                </div>
                <span className="badge-base badge-supporter">{item.statusLabel}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-supporter">{item.dueLabel}</p>
            </article>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
