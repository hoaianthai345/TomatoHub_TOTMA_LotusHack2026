"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import StatusBadge from "@/components/common/status-badge";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { listVolunteerRegistrations } from "@/lib/api/volunteer-registrations";
import { formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { VolunteerRegistration } from "@/types/volunteer-registration";

export default function RegistrationsPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      isLoading ||
      currentUser?.role !== "supporter" ||
      !currentUser.id ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      const [registrationResult, campaignResult] = await Promise.allSettled([
        listVolunteerRegistrations({
          userId: currentUser.id,
          token: accessToken,
          limit: 300,
        }),
        listPublishedCampaigns(200),
      ]);

      if (cancelled) {
        return;
      }

      if (registrationResult.status === "fulfilled") {
        setRegistrations(registrationResult.value);
        setErrorMessage(null);
      } else {
        const reason = registrationResult.reason;
        setRegistrations([]);
        setErrorMessage(
          reason instanceof ApiError
            ? reason.message
            : "Failed to load your registrations."
        );
      }

      if (campaignResult.status === "fulfilled") {
        setCampaigns(campaignResult.value);
      } else {
        setCampaigns([]);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.id, currentUser?.role, isLoading]);

  const campaignById = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign])),
    [campaigns]
  );

  return (
    <RoleGate role="supporter" loadingMessage="Loading your registrations...">
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">My Joined Campaigns</h1>
        <p className="mb-6 text-body">Campaigns where you already joined as a volunteer</p>

        {errorMessage ? (
          <StatePanel variant="error" className="mb-6" message={errorMessage} />
        ) : null}

        {registrations.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Registered At</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((item) => {
                  const campaign = campaignById.get(item.campaignId);

                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3 text-text">
                        {campaign ? (
                          <Link
                            href={`/campaigns/${campaign.slug}`}
                            className="font-medium text-heading hover:text-primary"
                          >
                            {campaign.title}
                          </Link>
                        ) : (
                          item.campaignId
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          kind="registration_status"
                          value={item.status}
                          size={14}
                        />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDateTime(item.registeredAt)}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {item.message ? <span>{item.message}</span> : <MissingValue text="N/A" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <StatePanel
            variant="empty"
            className="card-container p-6 text-center"
            message="You have no volunteer registrations yet."
          />
        )}
      </div>
    </RoleGate>
  );
}
