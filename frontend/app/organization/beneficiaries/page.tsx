"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listBeneficiaries } from "@/lib/api/beneficiaries";
import { listCampaignsByOrganization } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Beneficiary } from "@/types/beneficiary";
import type { Campaign } from "@/types/campaign";

const STATUS_STYLE: Record<string, string> = {
  added: "bg-surface-muted text-text-muted border-border",
  verified: "bg-info/10 text-info border-info/30",
  assigned: "bg-primary/10 text-primary border-primary/30",
  received: "bg-success/10 text-success border-success/30",
};

export default function BeneficiariesPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
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

    const loadBeneficiaries = async () => {
      try {
        const [beneficiaryList, campaignList] = await Promise.all([
          listBeneficiaries({
            organizationId,
            token: accessToken,
            limit: 300,
          }),
          listCampaignsByOrganization(organizationId, {
            limit: 300,
            token: accessToken,
          }),
        ]);

        if (!cancelled) {
          setBeneficiaries(beneficiaryList);
          setCampaigns(campaignList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load beneficiaries."
          );
        }
      }
    };

    loadBeneficiaries();

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

  return (
    <RoleGate role="organization" loadingMessage="Loading beneficiaries...">
      <div className="py-10">
        <Container>
          <SectionTitle
            title="Beneficiary Management"
            description="Beneficiaries are mainly managed by Organization in MVP."
          />

          {errorMessage ? (
            <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          {beneficiaries.length > 0 ? (
            <div className="overflow-hidden card-base">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Target Support</th>
                    <th className="px-4 py-3 font-semibold">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-border transition-colors hover:bg-surface-muted/50"
                    >
                      <td className="px-4 py-3 font-medium text-heading">{item.fullName}</td>
                      <td className="px-4 py-3 text-text">{item.location || "Not provided"}</td>
                      <td className="px-4 py-3 text-text">
                        {item.campaignId
                          ? campaignTitleById.get(item.campaignId) ?? item.campaignId
                          : "Unassigned"}
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
                      <td className="px-4 py-3 text-text">
                        {formatCurrency(item.targetSupportAmount)}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card-base p-6 text-sm text-text-muted">
              No beneficiaries found for this organization.
            </div>
          )}
        </Container>
      </div>
    </RoleGate>
  );
}
