"use client";

import { useMemo, useState } from "react";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import VietnamLocationFields from "@/components/location/VietnamLocationFields";
import { useAuth } from "@/lib/auth";
import { createCampaign } from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
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
  const { currentUser, accessToken } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    goalAmount: "5000",
    coverImageUrl: "",
    tags: "",
    startsAt: buildDefaultDateTime(8),
    endsAt: buildDefaultDateTime(18),
    supportTypes: ["money"] as CampaignSupportType[],
  });
  const [locationValue, setLocationValue] = useState<VietnamLocationValue>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser?.organizationId || !accessToken) {
      setErrorMessage("Organization authentication is required to create a campaign.");
      return;
    }

    setIsSubmitting(true);

    try {
      const campaign = await createCampaign(
        {
          organizationId: currentUser.organizationId,
          title: formData.title,
          shortDescription: formData.shortDescription,
          description: formData.description,
          goalAmount: Number(formData.goalAmount),
          province: locationValue.provinceName,
          district: locationValue.districtName,
          addressLine: locationValue.addressLine,
          coverImageUrl: formData.coverImageUrl,
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

      setSuccessMessage(
        `Campaign "${campaign.title}" was created successfully as a ${campaign.status} campaign.`
      );
      setFormData({
        title: "",
        shortDescription: "",
        description: "",
        goalAmount: "5000",
        coverImageUrl: "",
        tags: "",
        startsAt: buildDefaultDateTime(8),
        endsAt: buildDefaultDateTime(18),
        supportTypes: ["money"],
      });
      setLocationValue({});
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to create campaign."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Create Campaign"
          description="This form now submits a real draft campaign to the FastAPI backend."
        />

        <div className="max-w-3xl card-base p-6">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <input
              className="input-base"
              placeholder="Campaign title"
              required
              value={formData.title}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, title: event.target.value }))
              }
            />
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
            <div className="grid gap-4 md:grid-cols-2">
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
              <input
                className="input-base"
                placeholder="Tags (comma separated)"
                value={formData.tags}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, tags: event.target.value }))
                }
              />
            </div>
            <VietnamLocationFields
              value={locationValue}
              onChange={setLocationValue}
              includeWard={false}
              includeAddressLine
              helperText="This shared Vietnam location picker currently uses province and district because the backend campaign schema still stores those fields separately."
            />
            <input
              className="input-base"
              placeholder="Cover image URL"
              value={formData.coverImageUrl}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  coverImageUrl: event.target.value,
                }))
              }
            />
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

            {errorMessage ? (
              <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
                {successMessage}
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
  );
}
