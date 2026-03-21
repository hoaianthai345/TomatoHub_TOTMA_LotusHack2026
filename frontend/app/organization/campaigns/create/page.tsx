"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGate from "@/components/auth/RoleGate";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import VietnamLocationFields from "@/components/location/VietnamLocationFields";
import { useAuth } from "@/lib/auth";
import {
  createCampaign,
  uploadCampaignImage,
} from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { generateCampaignDraftRecommendation } from "@/lib/api/recommendations";
import type { CampaignSupportType } from "@/types/campaign";
import type { VietnamLocationValue } from "@/types/location";

const supportTypeOptions: { value: CampaignSupportType; label: string }[] = [
  { value: "money", label: "Money" },
  { value: "goods", label: "Goods" },
  { value: "volunteer", label: "Volunteer" },
];

function buildDefaultDateTime(hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const { currentUser, accessToken } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    goalAmount: "5000",
    tags: "",
    startsAt: buildDefaultDateTime(8),
    endsAt: buildDefaultDateTime(18),
    supportTypes: ["money"] as CampaignSupportType[],
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [locationValue, setLocationValue] = useState<VietnamLocationValue>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiHintMessage, setAiHintMessage] = useState<string | null>(null);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      Boolean(currentUser?.organizationId) &&
      Boolean(accessToken) &&
      formData.supportTypes.length > 0,
    [accessToken, currentUser?.organizationId, formData.supportTypes.length]
  );

  const toggleSupportType = (type: CampaignSupportType) => {
    setFormData((prev) => ({
      ...prev,
      supportTypes: prev.supportTypes.includes(type)
        ? prev.supportTypes.filter((item) => item !== type)
        : [...prev.supportTypes, type],
    }));
  };

  const handleAiAutofill = async () => {
    setErrorMessage(null);
    setAiHintMessage(null);

    if (!currentUser?.organizationId || !accessToken) {
      setErrorMessage("Organization authentication is required to use AI autofill.");
      return;
    }

    const title = formData.title.trim();
    if (title.length < 3) {
      setErrorMessage("Please enter campaign title before AI autofill.");
      return;
    }

    const campaignGoal = (formData.description || formData.shortDescription).trim();
    if (campaignGoal.length < 20) {
      setErrorMessage(
        "Please provide at least 20 characters in campaign description for AI autofill."
      );
      return;
    }

    const locationHint = [
      locationValue.addressLine?.trim(),
      locationValue.districtName?.trim(),
      locationValue.provinceName?.trim(),
    ]
      .filter((value): value is string => Boolean(value))
      .join(", ");

    setIsAiAutofilling(true);
    try {
      const recommendation = await generateCampaignDraftRecommendation(
        {
          title,
          campaign_goal: campaignGoal,
          beneficiary_context: campaignGoal,
          location_hint: locationHint || undefined,
          support_types_hint: formData.supportTypes,
          constraints: [],
          tone: "clear, transparent, community-driven",
        },
        accessToken
      );

      setFormData((prev) => ({
        ...prev,
        shortDescription: recommendation.shortDescription || prev.shortDescription,
        description: recommendation.description || prev.description,
        tags:
          recommendation.suggestedTags.length > 0
            ? recommendation.suggestedTags.join(", ")
            : prev.tags,
        supportTypes:
          recommendation.suggestedSupportTypes.length > 0
            ? recommendation.suggestedSupportTypes
            : prev.supportTypes,
      }));

      const modelLabel = recommendation.model ? ` (${recommendation.model})` : "";
      setAiHintMessage(`AI suggestion applied from ${recommendation.generatedBy}${modelLabel}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Failed to generate AI suggestion for campaign fields."
      );
    } finally {
      setIsAiAutofilling(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!currentUser?.organizationId || !accessToken) {
      setErrorMessage("Organization authentication is required to create a campaign.");
      return;
    }

    setIsSubmitting(true);

    try {
      const campaign = await createCampaign(
        {
          organizationId: currentUser.organizationId,
          title: formData.title.trim(),
          shortDescription: formData.shortDescription.trim() || undefined,
          description: formData.description.trim() || undefined,
          goalAmount: Number(formData.goalAmount),
          province: locationValue.provinceName,
          district: locationValue.districtName,
          addressLine: locationValue.addressLine?.trim() || undefined,
          tags: formData.tags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          startsAt: new Date(formData.startsAt).toISOString(),
          endsAt: formData.endsAt
            ? new Date(formData.endsAt).toISOString()
            : undefined,
          supportTypes: formData.supportTypes,
        },
        accessToken
      );

      if (coverImageFile) {
        await uploadCampaignImage(campaign.id, coverImageFile, accessToken, {
          setAsCover: true,
        });
      }

      router.replace(`/organization/campaigns?created=${campaign.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to create campaign."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGate role="organization" loadingMessage="Loading create campaign form...">
      <div className="py-10">
        <Container>
          <SectionTitle
            title="Create Campaign"
            description="Create a real draft campaign, then manage or publish it from your organization workspace."
          />

          <div className="max-w-3xl card-base p-6">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm text-text">
                <span>Campaign title</span>
                <input
                  className="input-base"
                  placeholder="Campaign title"
                  required
                  value={formData.title}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-text">
                <span>Short description</span>
                <input
                  className="input-base"
                  placeholder="Short description"
                  value={formData.shortDescription}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      shortDescription: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="grid gap-2 text-sm text-text">
                <span>Campaign description</span>
                <textarea
                  className="min-h-36 input-base"
                  placeholder="Campaign description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-base btn-secondary disabled:opacity-50"
                    onClick={handleAiAutofill}
                    disabled={isAiAutofilling || isSubmitting || !accessToken}
                  >
                    {isAiAutofilling ? "Generating AI..." : "AI Autofill Fields"}
                  </button>
                  <p className="text-xs text-text-muted">
                    AI will suggest short description, full description, tags, and support types from current input.
                  </p>
                </div>
                {aiHintMessage ? (
                  <p className="text-xs text-body">{aiHintMessage}</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-text">
                  <span>Goal amount</span>
                  <input
                    className="input-base"
                    placeholder="Goal amount"
                    inputMode="decimal"
                    required
                    value={formData.goalAmount}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        goalAmount: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="grid gap-2 text-sm text-text">
                  <span>Tags</span>
                  <input
                    className="input-base"
                    placeholder="Tags (comma separated)"
                    value={formData.tags}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, tags: event.target.value }))
                    }
                  />
                </label>
              </div>

              <VietnamLocationFields
                value={locationValue}
                onChange={setLocationValue}
                includeWard={false}
                includeAddressLine
                helperText="This shared Vietnam location picker currently uses province and district because the backend campaign schema still stores those fields separately."
              />

              <label className="grid gap-2 text-sm text-text">
                <span>Cover image (optional)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="input-base"
                  onChange={(event) =>
                    setCoverImageFile(event.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-text-muted">
                  If empty, campaign will use default image from public assets.
                </p>
                {coverImageFile ? (
                  <p className="text-xs text-body">
                    Selected file: {coverImageFile.name}
                  </p>
                ) : null}
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-text">
                  <span>Starts at</span>
                  <input
                    type="datetime-local"
                    className="input-base"
                    required
                    value={formData.startsAt}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        startsAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm text-text">
                  <span>Ends at</span>
                  <input
                    type="datetime-local"
                    className="input-base"
                    value={formData.endsAt}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        endsAt: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-medium text-heading">Support types</p>
                <div className="flex flex-wrap gap-3">
                  {supportTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={formData.supportTypes.includes(option.value)}
                        onChange={() => toggleSupportType(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-text-muted">
                New campaigns are created as drafts. You can publish them from the campaign management page after review.
              </p>

              {errorMessage ? (
                <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                  {errorMessage}
                </p>
              ) : null}

              <button
                className="w-fit btn-base btn-primary disabled:opacity-50"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Draft Campaign"}
              </button>
            </form>
          </div>
        </Container>
      </div>
    </RoleGate>
  );
}
