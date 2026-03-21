"use client";

import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { getSupporterParticipationCards } from "@/mocks/dashboard-experience";

export default function RegistrationsPage() {
  const { currentUser } = useAuth();
  const items = getSupporterParticipationCards(currentUser?.id);

  return (
    <RoleGate role="supporter" loadingMessage="Loading registrations...">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-heading">My Registrations</h1>
          <p className="mt-2 text-body">
            Campaigns you have already registered for, using shared sample state for the frontend.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="card-base rounded-3xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.coverImage}
                alt={item.campaignTitle}
                className="h-44 w-full object-cover"
              />
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  <span className="badge-base badge-supporter">{item.roleLabel}</span>
                  <span className="badge-base border border-border bg-surface-light text-text">
                    {item.statusLabel}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold text-heading">{item.campaignTitle}</h2>
                <p className="mt-1 text-sm text-text-muted">{item.campaignLocation}</p>
                <p className="mt-3 text-sm text-text">{item.nextStep}</p>
                <p className="mt-4 text-sm font-medium text-supporter">{item.dateLabel}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
