"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import { useAuth } from "@/lib/auth";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import { createDonation } from "@/lib/api/donations";
import { ApiError } from "@/lib/api/http";
import type { Campaign } from "@/types/campaign";
import { formatCurrency } from "@/utils/format";

export default function DonatePage() {
  const { currentUser, accessToken } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [donorName, setDonorName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [preferredCampaignId, setPreferredCampaignId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("campaignId");
    setPreferredCampaignId(value);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCampaigns = async () => {
      try {
        const publishedCampaigns = await listPublishedCampaigns(200);
        if (!cancelled) {
          setCampaigns(publishedCampaigns);
          setSelectedCampaignId((previous) => {
            if (previous) {
              return previous;
            }
            if (
              preferredCampaignId &&
              publishedCampaigns.some((campaign) => campaign.id === preferredCampaignId)
            ) {
              return preferredCampaignId;
            }
            return publishedCampaigns[0]?.id ?? "";
          });
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load campaigns for donation."
          );
        }
      }
    };

    loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, [preferredCampaignId]);

  useEffect(() => {
    if (currentUser?.name) {
      setDonorName((previous) => previous || currentUser.name);
    }
  }, [currentUser?.name]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    const normalizedDonorName = donorName.trim();
    const amountValue = Number(amount);

    if (!selectedCampaignId) {
      setErrorMessage("Please select a campaign.");
      return;
    }
    if (!normalizedDonorName) {
      setErrorMessage("Donor name is required.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setErrorMessage("Amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const donation = await createDonation(
        {
          campaignId: selectedCampaignId,
          donorName: normalizedDonorName,
          donorUserId: currentUser?.id,
          amount: amountValue,
          currency: "VND",
          paymentMethod,
          note: note.trim() || undefined,
        },
        accessToken ?? undefined
      );

      setAmount("");
      setNote("");
      setErrorMessage(null);
      setSuccessMessage(
        `Donation submitted: ${formatCurrency(donation.amount)} for campaign "${selectedCampaign?.title ?? donation.campaignId}".`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to submit donation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Donation Form"
          description="Submit real donations to backend API. Logged-in users are linked to their account."
        />

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
                  disabled={campaigns.length === 0 || isSubmitting}
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
                <label htmlFor="donorName" className="mb-2 block text-sm font-medium text-text">
                  Donor name
                </label>
                <input
                  id="donorName"
                  type="text"
                  className="input-base"
                  value={donorName}
                  onChange={(event) => setDonorName(event.target.value)}
                  placeholder="Enter your name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="amount" className="mb-2 block text-sm font-medium text-text">
                  Amount (VND)
                </label>
                <input
                  id="amount"
                  type="number"
                  min={1}
                  step={1000}
                  className="input-base"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Example: 500000"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="paymentMethod" className="mb-2 block text-sm font-medium text-text">
                  Payment method
                </label>
                <select
                  id="paymentMethod"
                  className="input-base"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="momo">MoMo</option>
                </select>
              </div>

              <div>
                <label htmlFor="note" className="mb-2 block text-sm font-medium text-text">
                  Note (optional)
                </label>
                <textarea
                  id="note"
                  className="input-base min-h-28"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Any message for organization"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                className="btn-base btn-primary w-full"
                disabled={isSubmitting || campaigns.length === 0}
              >
                {isSubmitting ? "Submitting..." : "Submit donation"}
              </button>
            </form>
          </div>

          <aside className="card-base p-6">
            <h3 className="text-lg font-semibold text-heading">Selected Campaign</h3>
            {selectedCampaign ? (
              <>
                <p className="mt-2 font-medium text-heading">{selectedCampaign.title}</p>
                <p className="mt-2 text-sm text-text-muted line-clamp-3">
                  {selectedCampaign.shortDescription || selectedCampaign.description}
                </p>
                <p className="mt-3 text-sm text-text">
                  Raised:{" "}
                  <span className="font-semibold text-primary">
                    {formatCurrency(selectedCampaign.raisedAmount)}
                  </span>{" "}
                  /{" "}
                  <span className="text-text-muted">
                    {formatCurrency(selectedCampaign.goalAmount ?? selectedCampaign.targetAmount)}
                  </span>
                </p>
                <Link
                  href={`/campaigns/${selectedCampaign.slug}`}
                  className="mt-4 inline-flex btn-base btn-secondary"
                >
                  View campaign detail
                </Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-text-muted">
                Select a campaign to continue.
              </p>
            )}
          </aside>
        </div>
      </Container>
    </div>
  );
}
