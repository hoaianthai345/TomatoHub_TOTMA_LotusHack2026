"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import RoleGate from "@/components/auth/RoleGate";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import StatusBadge from "@/components/common/status-badge";
import { useAuth } from "@/lib/auth";
import { listBeneficiaries } from "@/lib/api/beneficiaries";
import { listCampaignsByOrganization } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Beneficiary } from "@/types/beneficiary";
import type { Campaign } from "@/types/campaign";

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
            <StatePanel variant="error" className="mb-6" message={errorMessage} />
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
                      <td className="px-4 py-3 text-text">
                        {item.location ? <span>{item.location}</span> : <MissingValue />}
                      </td>
                      <td className="px-4 py-3 text-text">
                        {item.campaignId
                          ? campaignTitleById.get(item.campaignId) ?? item.campaignId
                          : <MissingValue text="Unassigned" />}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          kind="beneficiary_status"
                          value={item.status}
                          size={14}
                        />
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
            <StatePanel
              variant="empty"
              message="No beneficiaries found for this organization."
            />
          )}
        </Container>
      </div>
    </RoleGate>
  );
}
