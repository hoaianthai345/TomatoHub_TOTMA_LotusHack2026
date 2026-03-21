"use client";

import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { getSupporterContributionItems } from "@/mocks/dashboard-experience";

export default function ContributionsPage() {
  const { currentUser } = useAuth();
  const items = getSupporterContributionItems(currentUser?.id);

  return (
    <RoleGate role="supporter" loadingMessage="Loading contributions...">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-heading">My Contributions</h1>
          <p className="mt-2 text-body">
            Sample supporter history for donation, goods support, and volunteer participation.
          </p>
        </div>

        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="card-base rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    {item.contributionType}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-heading">{item.campaignTitle}</h2>
                </div>
                <span className="badge-base badge-supporter">{item.statusLabel}</span>
              </div>
              <p className="mt-3 text-sm text-text">{item.summary}</p>
              <p className="mt-4 text-sm text-text-muted">{item.dateLabel}</p>
            </article>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
