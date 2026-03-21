"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { listVolunteerRegistrations } from "@/lib/api/volunteer-registrations";
import { formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { VolunteerRegistration } from "@/types/volunteer-registration";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-surface-muted text-text-muted border-border",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-danger/10 text-danger border-danger/30",
  cancelled: "bg-warning/10 text-warning border-warning/30",
};

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
      try {
        const [registrationList, campaignList] = await Promise.all([
          listVolunteerRegistrations({
            userId: currentUser.id,
            token: accessToken,
            limit: 300,
          }),
          listPublishedCampaigns(200),
        ]);

        if (!cancelled) {
          setRegistrations(registrationList);
          setCampaigns(campaignList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load your registrations."
          );
        }
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
          <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
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
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                            STATUS_STYLE[item.status] ?? "bg-surface-muted text-text-muted border-border"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDateTime(item.registeredAt)}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{item.message ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-container p-6 text-center text-muted">
            <p>You have no volunteer registrations yet.</p>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
