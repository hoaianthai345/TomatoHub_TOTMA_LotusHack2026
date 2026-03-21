"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RoleGate from "@/components/auth/RoleGate";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import { useAuth } from "@/lib/auth";
import {
  getCampaignById,
  uploadCampaignImage,
  updateCampaign,
} from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import type { CampaignSupportType } from "@/types/campaign";

const supportTypeOptions: { value: CampaignSupportType; label: string }[] = [
  { value: "money", label: "Money" },
  { value: "goods", label: "Goods" },
  { value: "volunteer", label: "Volunteer" },
];

interface EditCampaignFormState {
  title: string;
  shortDescription: string;
  description: string;
  goalAmount: string;
  tags: string;
  startsAt: string;
  endsAt: string;
  supportTypes: CampaignSupportType[];
  province: string;
  district: string;
  addressLine: string;
}

function emptyForm(): EditCampaignFormState {
  return {
    title: "",
    shortDescription: "",
    description: "",
    goalAmount: "",
    tags: "",
    startsAt: "",
    endsAt: "",
    supportTypes: [],
    province: "",
    district: "",
    addressLine: "",
  };
}

function toDatetimeLocal(value?: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const campaignId = params?.id;
  const { currentUser, accessToken, isLoading } = useAuth();
  const [formState, setFormState] = useState<EditCampaignFormState>(emptyForm());
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [currentCoverImage, setCurrentCoverImage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      isLoading ||
      currentUser?.role !== "organization" ||
      !currentUser.organizationId ||
      !campaignId
    ) {
      return;
    }

    let cancelled = false;

    const loadCampaign = async () => {
      setIsPageLoading(true);
      try {
        const campaign = await getCampaignById(campaignId);

        if (campaign.organizationId !== currentUser.organizationId) {
          if (!cancelled) {
            setErrorMessage("You cannot edit campaigns from another organization.");
          }
          return;
        }

        if (!cancelled) {
          setFormState({
            title: campaign.title,
            shortDescription: campaign.shortDescription || "",
            description: campaign.description || "",
            goalAmount: String(campaign.goalAmount ?? campaign.targetAmount ?? ""),
            tags: (campaign.tags ?? []).join(", "),
            startsAt: toDatetimeLocal(campaign.startsAt),
            endsAt: toDatetimeLocal(campaign.endsAt),
            supportTypes: campaign.supportTypes ?? [],
            province: campaign.province || "",
            district: campaign.district || "",
            addressLine: campaign.addressLine || "",
          });
          setCurrentCoverImage(campaign.coverImage || "");
          setCoverImageFile(null);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Failed to load campaign."
          );
        }
      } finally {
        if (!cancelled) {
          setIsPageLoading(false);
        }
      }
    };

    loadCampaign();

    return () => {
      cancelled = true;
    };
  }, [campaignId, currentUser?.organizationId, currentUser?.role, isLoading]);

  const canSubmit = useMemo(
    () =>
      Boolean(currentUser?.organizationId) &&
      Boolean(accessToken) &&
      formState.title.trim().length >= 3 &&
      formState.supportTypes.length > 0 &&
      !isSubmitting,
    [accessToken, currentUser?.organizationId, formState.supportTypes.length, formState.title, isSubmitting]
  );

  const toggleSupportType = (type: CampaignSupportType) => {
    setFormState((prev) => ({
      ...prev,
      supportTypes: prev.supportTypes.includes(type)
        ? prev.supportTypes.filter((item) => item !== type)
        : [...prev.supportTypes, type],
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!campaignId || !currentUser?.organizationId || !accessToken) {
      setErrorMessage("Organization authentication is required to update campaign.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await updateCampaign(
        campaignId,
        {
          organizationId: currentUser.organizationId,
          title: formState.title.trim(),
          shortDescription: formState.shortDescription.trim() || undefined,
          description: formState.description.trim() || undefined,
          goalAmount: Number(formState.goalAmount),
          province: formState.province.trim() || undefined,
          district: formState.district.trim() || undefined,
          addressLine: formState.addressLine.trim() || undefined,
          tags: formState.tags
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          startsAt: formState.startsAt
            ? new Date(formState.startsAt).toISOString()
            : undefined,
          endsAt: formState.endsAt
            ? new Date(formState.endsAt).toISOString()
            : null,
          supportTypes: formState.supportTypes,
        },
        accessToken
      );

      if (coverImageFile) {
        await uploadCampaignImage(updated.id, coverImageFile, accessToken, {
          setAsCover: true,
        });
      }

      router.replace(`/organization/campaigns?updated=${updated.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to update campaign."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleGate role="organization" loadingMessage="Loading edit campaign form...">
      <div className="py-10">
        <Container>
          <SectionTitle
            title="Edit Campaign"
            description="Update campaign details, volunteer requirements, and publication-ready content."
          />

          <div className="max-w-3xl card-base p-6">
            {isPageLoading ? (
              <p className="text-sm text-text-muted">Loading campaign data...</p>
            ) : (
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-2 text-sm text-text">
                  <span>Campaign title</span>
                  <input
                    className="input-base"
                    placeholder="Campaign title"
                    required
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </label>

                <label className="grid gap-2 text-sm text-text">
                  <span>Short description</span>
                  <input
                    className="input-base"
                    placeholder="Short description"
                    value={formState.shortDescription}
                    onChange={(event) =>
                      setFormState((prev) => ({
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
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm text-text">
                    <span>Goal amount</span>
                    <input
                      className="input-base"
                      inputMode="decimal"
                      required
                      value={formState.goalAmount}
                      onChange={(event) =>
                        setFormState((prev) => ({
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
                      value={formState.tags}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, tags: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="grid gap-2 text-sm text-text">
                    <span>Province / City</span>
                    <input
                      className="input-base"
                      value={formState.province}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, province: event.target.value }))
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-text">
                    <span>District</span>
                    <input
                      className="input-base"
                      value={formState.district}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, district: event.target.value }))
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-text">
                    <span>Address line</span>
                    <input
                      className="input-base"
                      value={formState.addressLine}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          addressLine: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

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
                    If empty, current image is kept. Campaigns without image use the default cover from public assets.
                  </p>
                  {coverImageFile ? (
                    <p className="text-xs text-body">
                      Selected file: {coverImageFile.name}
                    </p>
                  ) : null}
                  {currentCoverImage ? (
                    <p className="text-xs text-text-muted">
                      Current cover: {currentCoverImage}
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
                      value={formState.startsAt}
                      onChange={(event) =>
                        setFormState((prev) => ({
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
                      value={formState.endsAt}
                      onChange={(event) =>
                        setFormState((prev) => ({
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
                          checked={formState.supportTypes.includes(option.value)}
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

                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn-base btn-primary disabled:opacity-50"
                    disabled={!canSubmit}
                  >
                    {isSubmitting ? "Saving..." : "Save Campaign Changes"}
                  </button>
                  <button
                    type="button"
                    className="btn-base btn-secondary"
                    onClick={() => router.replace("/organization/campaigns")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </Container>
      </div>
    </RoleGate>
  );
}
