"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listCampaignsByOrganization } from "@/lib/api/campaigns";
import { listDonations } from "@/lib/api/donations";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { Donation } from "@/types/donation";

export default function DonationsPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const organizationId = currentUser?.organizationId;
    if (
      isLoading ||
      currentUser?.role !== "organization" ||
      !organizationId ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    const loadDonations = async () => {
      try {
        const [donationList, campaignList] = await Promise.all([
          listDonations({
            organizationId,
            token: accessToken,
            limit: 500,
          }),
          listCampaignsByOrganization(organizationId, { limit: 300 }),
        ]);

        if (!cancelled) {
          setDonations(donationList);
          setCampaigns(campaignList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Failed to load donations."
          );
        }
      }
    };

    loadDonations();

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    currentUser?.organizationId,
    currentUser?.role,
    isLoading,
  ]);

  const campaignTitleById = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign.title])),
    [campaigns]
  );

  const totalDonated = donations.reduce((sum, item) => sum + item.amount, 0);

  return (
    <RoleGate role="organization" loadingMessage="Loading donations...">
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">Donations</h1>
        <p className="mb-6 text-body">Track all donations and contributions</p>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Total Donations</p>
            <p className="mt-1 text-2xl font-semibold text-heading">{donations.length}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Total Raised</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {formatCurrency(totalDonated)}
            </p>
          </div>
          <div className="card-base p-4">
            <p className="text-sm text-text-muted">Unique Donors</p>
            <p className="mt-1 text-2xl font-semibold text-heading">
              {new Set(donations.map((item) => item.donorUserId ?? item.donorName)).size}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        {donations.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Donor</th>
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-3 text-heading">{item.donorName}</td>
                    <td className="px-4 py-3 text-text">
                      {campaignTitleById.get(item.campaignId) ?? item.campaignId}
                    </td>
                    <td className="px-4 py-3 text-primary">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-text">{item.paymentMethod}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{item.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-container p-6 text-center text-muted">
            <p>No donations found for this organization yet.</p>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
