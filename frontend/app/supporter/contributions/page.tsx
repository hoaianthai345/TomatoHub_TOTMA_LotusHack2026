"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { listDonations } from "@/lib/api/donations";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { Donation } from "@/types/donation";

export default function ContributionsPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
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
        const [donationList, publishedCampaigns] = await Promise.all([
          listDonations({
            donorUserId: currentUser.id,
            token: accessToken,
            limit: 300,
          }),
          listPublishedCampaigns(200),
        ]);

        if (!cancelled) {
          setDonations(donationList);
          setCampaigns(publishedCampaigns);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load contributions."
          );
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.id, currentUser?.role, isLoading]);

  const campaignTitleById = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign.title])),
    [campaigns]
  );

  const totalDonated = donations.reduce((sum, item) => sum + item.amount, 0);

  return (
    <RoleGate role="supporter" loadingMessage="Loading your contributions...">
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">My Contributions</h1>
        <p className="mb-6 text-body">Track all your contributions to campaigns</p>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Total Contributions</p>
            <p className="mt-1 text-2xl font-semibold text-heading">{donations.length}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Total Donated</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {formatCurrency(totalDonated)}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <StatePanel variant="error" className="mb-6" message={errorMessage} />
        ) : null}

        {donations.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Payment Method</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 text-text">
                      {campaignTitleById.get(item.campaignId) ?? item.campaignId}
                    </td>
                    <td className="px-4 py-3 text-primary">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-3 text-text">{item.paymentMethod}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {item.note ? <span>{item.note}</span> : <MissingValue text="N/A" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StatePanel variant="empty" message="You have no contributions yet." />
        )}
      </div>
    </RoleGate>
  );
}
