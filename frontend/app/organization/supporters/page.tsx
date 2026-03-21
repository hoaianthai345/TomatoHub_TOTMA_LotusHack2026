"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { getSupportTypeLabel } from "@/lib/auth/supportTypes";
import { listSupporters } from "@/lib/api/supporters";
import { listCampaignsByOrganization } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import type { Supporter } from "@/types/supporter";
import type { Campaign } from "@/types/campaign";

export default function SupportersPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [supporters, setSupporters] = useState<Supporter[]>([]);
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

    const loadSupporters = async () => {
      try {
        const [supporterList, campaignList] = await Promise.all([
          listSupporters({
            organizationId,
            token: accessToken,
          }),
          listCampaignsByOrganization(organizationId, { limit: 200 }),
        ]);

        if (!cancelled) {
          setSupporters(supporterList);
          setCampaigns(campaignList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load supporters."
          );
        }
      }
    };

    loadSupporters();

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

  const formatJoinedCampaigns = (campaignIds: string[]): string => {
    if (campaignIds.length === 0) {
      return "No campaign activity yet";
    }

    const labels = campaignIds
      .slice(0, 2)
      .map((campaignId) => campaignTitleById.get(campaignId) ?? campaignId);
    const remaining = campaignIds.length - labels.length;

    if (remaining > 0) {
      labels.push(`+${remaining} more`);
    }

    return labels.join(", ");
  };

  return (
    <RoleGate role="organization" loadingMessage="Loading supporters...">
      <div className="py-10">
        <Container>
          <SectionTitle
            title="Supporter Management"
            description="Track supporter types and participation at organization level."
          />

          {errorMessage ? (
            <p className="mb-6 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          {supporters.length > 0 ? (
            <div className="grid gap-4">
              {supporters.map((item) => (
                <div key={item.id} className="card-base p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-heading">{item.fullName}</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        {item.email ?? "No email"} · {item.location ?? "No location"}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-muted border border-border">
                      {item.joinedCampaignIds.length} campaign(s)
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-text">
                    Support types:{" "}
                    <span className="font-medium">
                      {(item.supportTypes ?? []).length > 0
                        ? item.supportTypes.map(getSupportTypeLabel).join(", ")
                        : "Not set"}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Joined campaigns: {formatJoinedCampaigns(item.joinedCampaignIds)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-base p-6 text-sm text-text-muted">
              No supporters have joined this organization&apos;s campaigns yet.
            </div>
          )}
        </Container>
      </div>
    </RoleGate>
  );
}
