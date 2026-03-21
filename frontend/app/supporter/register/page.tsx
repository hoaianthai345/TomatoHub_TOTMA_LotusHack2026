"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RoleGate from "@/components/auth/RoleGate";
import FormField from "@/components/common/form-field";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import StatusBadge from "@/components/common/status-badge";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import {
  createVolunteerRegistration,
  listVolunteerRegistrations,
} from "@/lib/api/volunteer-registrations";
import { formatDateTime } from "@/utils/format";
import type { Campaign } from "@/types/campaign";
import type {
  VolunteerRegistration,
  VolunteerRole,
} from "@/types/volunteer-registration";

const VOLUNTEER_ROLE_OPTIONS: Array<{ value: VolunteerRole; label: string }> = [
  { value: "delivery", label: "Delivery" },
  { value: "packing", label: "Packing" },
  { value: "medic", label: "Medic" },
  { value: "online", label: "Online support" },
];

function toIsoDateTime(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatShiftRange(startAt?: string, endAt?: string): string {
  if (startAt && endAt) {
    return `${formatDateTime(startAt)} - ${formatDateTime(endAt)}`;
  }
  if (startAt) {
    return `Starts at ${formatDateTime(startAt)}`;
  }
  if (endAt) {
    return `Ends at ${formatDateTime(endAt)}`;
  }
  return "N/A";
}

export default function RegisterSupportPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [role, setRole] = useState<VolunteerRole>("delivery");
  const [shiftStartAt, setShiftStartAt] = useState<string>("");
  const [shiftEndAt, setShiftEndAt] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preferredCampaignId, setPreferredCampaignId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPreferredCampaignId(params.get("campaignId"));
  }, []);

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
          setSelectedCampaignId((previous) => {
            if (previous && campaignList.some((campaign) => campaign.id === previous)) {
              return previous;
            }
            if (
              preferredCampaignId &&
              campaignList.some((campaign) => campaign.id === preferredCampaignId)
            ) {
              return preferredCampaignId;
            }
            return campaignList[0]?.id ?? "";
          });
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
  }, [accessToken, currentUser?.id, currentUser?.role, isLoading, preferredCampaignId]);

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

    const shiftStartIso = toIsoDateTime(shiftStartAt);
    const shiftEndIso = toIsoDateTime(shiftEndAt);
    if (shiftStartAt.trim() && !shiftStartIso) {
      setErrorMessage("Shift start time is invalid.");
      return;
    }
    if (shiftEndAt.trim() && !shiftEndIso) {
      setErrorMessage("Shift end time is invalid.");
      return;
    }
    if (shiftStartIso && shiftEndIso && new Date(shiftEndIso) <= new Date(shiftStartIso)) {
      setErrorMessage("Shift end time must be after shift start time.");
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
          role,
          shiftStartAt: shiftStartIso,
          shiftEndAt: shiftEndIso,
          message: message.trim() || undefined,
        },
        accessToken
      );

      setRegistrations((prev) => [created, ...prev]);
      setPhoneNumber("");
      setShiftStartAt("");
      setShiftEndAt("");
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
          <StatePanel variant="error" className="mb-4" message={errorMessage} />
        ) : null}
        {successMessage ? (
          <StatePanel variant="success" className="mb-4" message={successMessage} />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="card-base p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormField label="Campaign" required>
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
              </FormField>

              <FormField label="Phone number (optional)">
                <input
                  id="phone"
                  type="text"
                  className="input-base"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="Your contact number"
                />
              </FormField>

              <FormField label="Volunteer role">
                <select
                  id="role"
                  className="input-base"
                  value={role}
                  onChange={(event) => setRole(event.target.value as VolunteerRole)}
                >
                  {VOLUNTEER_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Shift start (optional)">
                  <input
                    id="shift-start"
                    type="datetime-local"
                    className="input-base"
                    value={shiftStartAt}
                    onChange={(event) => setShiftStartAt(event.target.value)}
                  />
                </FormField>

                <FormField label="Shift end (optional)">
                  <input
                    id="shift-end"
                    type="datetime-local"
                    className="input-base"
                    value={shiftEndAt}
                    onChange={(event) => setShiftEndAt(event.target.value)}
                  />
                </FormField>
              </div>

              <FormField label="Message (optional)">
                <textarea
                  id="message"
                  className="input-base min-h-28"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="How can you help this campaign?"
                />
              </FormField>

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
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Shift</th>
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
                      <td className="px-4 py-3 text-text-muted">
                        {item.role ? <span>{item.role}</span> : <MissingValue text="Not assigned" />}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {item.shiftStartAt || item.shiftEndAt ? (
                          <span>{formatShiftRange(item.shiftStartAt, item.shiftEndAt)}</span>
                        ) : (
                          <MissingValue text="N/A" />
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <StatePanel
              variant="empty"
              className="mt-4"
              message="You have no registration yet."
            />
          )}
        </div>
      </div>
    </RoleGate>
  );
}
