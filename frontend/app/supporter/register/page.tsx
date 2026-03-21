"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import {
  createVolunteerRegistration,
  listVolunteerRegistrations,
} from "@/lib/api/volunteer-registrations";
import { formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type { VolunteerRegistration } from "@/types/volunteer-registration";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-surface-muted text-text-muted border-border",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-danger/10 text-danger border-danger/30",
};

export default function RegisterSupportPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        const [campaignList, registrationList] = await Promise.all([
          listPublishedCampaigns(200),
          listVolunteerRegistrations({
            userId: currentUser.id,
            token: accessToken,
            limit: 100,
          }),
        ]);

        if (!cancelled) {
          setCampaigns(campaignList);
          setRegistrations(registrationList);
          if (campaignList.length > 0) {
            setSelectedCampaignId((previous) => previous || campaignList[0].id);
          }
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load campaign registration form."
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (!accessToken || !currentUser?.id) {
      setErrorMessage("You need to login before submitting.");
      return;
    }
    if (!currentUser.email) {
      setErrorMessage("Your account is missing email. Please update profile first.");
      return;
    }
    if (!selectedCampaignId) {
      setErrorMessage("Please select a campaign.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createVolunteerRegistration(
        {
          campaignId: selectedCampaignId,
          userId: currentUser.id,
          fullName: currentUser.name,
          email: currentUser.email,
          phoneNumber: phoneNumber.trim() || undefined,
          message: message.trim() || undefined,
        },
        accessToken
      );

      setRegistrations((prev) => [created, ...prev]);
      setPhoneNumber("");
      setMessage("");
      setSuccessMessage("Registration submitted successfully.");
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Failed to submit volunteer registration."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGate role="supporter" loadingMessage="Loading registration form...">
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">Register Support</h1>
        <p className="mb-6 text-body">
          Browse campaigns and register your support
        </p>

        {errorMessage ? (
          <p className="mb-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mb-4 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
            {successMessage}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="card-base p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="campaign" className="mb-2 block text-sm font-medium text-text">
                  Campaign
                </label>
                <select
                  id="campaign"
                  className="input-base"
                  value={selectedCampaignId}
                  onChange={(event) => setSelectedCampaignId(event.target.value)}
                  disabled={campaigns.length === 0}
                  required
                >
                  {campaigns.length === 0 ? (
                    <option value="">No published campaign available</option>
                  ) : null}
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-text">
                  Phone number (optional)
                </label>
                <input
                  id="phone"
                  type="text"
                  className="input-base"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Your contact number"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-text">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  className="input-base min-h-28"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="How can you help this campaign?"
                />
              </div>

              <button
                type="submit"
                className="btn-base btn-primary w-full"
                disabled={submitting || campaigns.length === 0}
              >
                {submitting ? "Submitting..." : "Submit registration"}
              </button>
            </form>
          </div>

          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-heading">Quick Links</h2>
            <p className="mt-2 text-sm text-text-muted">
              Check campaign details before registering.
            </p>
            <div className="mt-4 space-y-2">
              <Link href="/campaigns" className="btn-base btn-secondary w-full text-center">
                Browse campaigns
              </Link>
              <Link
                href="/supporter/registrations"
                className="btn-base btn-secondary w-full text-center"
              >
                View my registrations
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 card-base p-6">
          <h2 className="text-lg font-semibold text-heading">Recent Registrations</h2>
          <p className="mt-2 text-sm text-text-muted">
            Most recent registrations linked to your account.
          </p>
          {registrations.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.slice(0, 6).map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3 text-text">
                        {campaignTitleById.get(item.campaignId) ?? item.campaignId}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-border bg-surface-muted/50 p-4 text-sm text-text-muted">
              You have no registration yet.
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
