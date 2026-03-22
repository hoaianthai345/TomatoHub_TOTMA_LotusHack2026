"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { Skeleton, TextSkeleton } from "@/components/loading";
import { useAuth } from "@/lib/auth";
import {
  AuthApiError,
  updateOrganizationProfileApi,
} from "@/lib/auth/api";
import { getOrganizationById } from "@/lib/api/organizations";
import { ApiError } from "@/lib/api/http";

interface OrganizationProfileFormState {
  organizationName: string;
  representativeName: string;
  location: string;
  description: string;
  website: string;
  logoUrl: string;
}

function buildInitialState(): OrganizationProfileFormState {
  return {
    organizationName: "",
    representativeName: "",
    location: "",
    description: "",
    website: "",
    logoUrl: "",
  };
}

export default function OrganizationProfilePage() {
  const { currentUser, accessToken, refreshCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [formState, setFormState] = useState<OrganizationProfileFormState>(
    buildInitialState()
  );
  const [savedState, setSavedState] = useState<OrganizationProfileFormState>(
    buildInitialState()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const organizationId = currentUser?.organizationId;
    if (!organizationId || isEditing) {
      return;
    }

    let cancelled = false;

    const loadOrganization = async () => {
      setIsLoadingDetails(true);
      try {
        const organization = await getOrganizationById(organizationId);
        if (!cancelled) {
          const nextState = {
            organizationName:
              organization.name || currentUser?.organizationName || "",
            representativeName: currentUser?.name || "",
            location: organization.location || currentUser?.location || "",
            description: organization.description || "",
            website: organization.website || "",
            logoUrl: organization.logoUrl || "",
          };
          setFormState(nextState);
          setSavedState(nextState);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load organization profile details."
          );
          const fallbackState = {
            organizationName: currentUser?.organizationName || currentUser?.name || "",
            representativeName: currentUser?.name || "",
            location: currentUser?.location || "",
            description: "",
            website: "",
            logoUrl: "",
          };
          setFormState(fallbackState);
          setSavedState(fallbackState);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      }
    };

    loadOrganization();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.location, currentUser?.name, currentUser?.organizationId, currentUser?.organizationName, isEditing]);

  const canSubmit = useMemo(
    () =>
      formState.organizationName.trim().length >= 2 &&
      formState.representativeName.trim().length >= 2 &&
      !isSaving,
    [formState.organizationName, formState.representativeName, isSaving]
  );

  const handleCancel = () => {
    setFormState(savedState);
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!accessToken) {
      setErrorMessage("Organization authentication is required to update profile.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateOrganizationProfileApi(
        {
          organizationName: formState.organizationName.trim(),
          representativeName: formState.representativeName.trim(),
          location: formState.location.trim() || undefined,
          description: formState.description.trim() || undefined,
          website: formState.website.trim() || undefined,
          logoUrl: formState.logoUrl.trim() || undefined,
        },
        accessToken
      );
      await refreshCurrentUser();
      const nextSavedState: OrganizationProfileFormState = {
        organizationName: formState.organizationName.trim(),
        representativeName: formState.representativeName.trim(),
        location: formState.location.trim(),
        description: formState.description.trim(),
        website: formState.website.trim(),
        logoUrl: formState.logoUrl.trim(),
      };
      setSavedState(nextSavedState);
      setFormState(nextSavedState);
      setSuccessMessage("Organization profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(
        error instanceof AuthApiError
          ? error.message
          : "Failed to update organization profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleGate role="organization" loadingMessage="Loading organization profile...">
      <div className="space-y-6 p-6">
        <div className="card-base overflow-hidden border border-org/20 bg-[linear-gradient(130deg,_rgba(124,58,237,0.15),_rgba(255,255,255,0.98))]">
          <div className="grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-org">
                Organization Profile
              </p>
              <h1 className="mt-2 text-3xl font-bold text-heading">
                {formState.organizationName || currentUser?.organizationName || currentUser?.name}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Keep organization details clear so supporters and beneficiaries can trust your updates.
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="btn-base bg-org text-white"
                disabled={isLoadingDetails}
              >
                Edit profile
              </button>
            ) : null}
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

        <div className="card-base max-w-4xl p-6">
          {isLoadingDetails && !isEditing ? (
            <div className="space-y-4">
              <p className="sr-only" aria-live="polite">
                Loading organization details...
              </p>
              <TextSkeleton lines={2} lineClassName="h-4 w-full rounded" />
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={`profile-field-skeleton-${index}`} className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-11 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ) : isEditing ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-text">
                <span className="font-medium text-heading">Organization name</span>
                <input
                  className="input-base"
                  value={formState.organizationName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      organizationName: event.target.value,
                    }))
                  }
                  placeholder="Organization name"
                />
              </label>

              <label className="grid gap-2 text-sm text-text">
                <span className="font-medium text-heading">Representative name</span>
                <input
                  className="input-base"
                  value={formState.representativeName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      representativeName: event.target.value,
                    }))
                  }
                  placeholder="Representative name"
                />
              </label>

              <label className="grid gap-2 text-sm text-text md:col-span-2">
                <span className="font-medium text-heading">Location</span>
                <input
                  className="input-base"
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, location: event.target.value }))
                  }
                  placeholder="District, City"
                />
              </label>

              <label className="grid gap-2 text-sm text-text md:col-span-2">
                <span className="font-medium text-heading">Description</span>
                <textarea
                  className="input-base min-h-32"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="What does your organization do?"
                />
              </label>

              <label className="grid gap-2 text-sm text-text">
                <span className="font-medium text-heading">Website</span>
                <input
                  className="input-base"
                  value={formState.website}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, website: event.target.value }))
                  }
                  placeholder="https://example.org"
                />
              </label>

              <label className="grid gap-2 text-sm text-text">
                <span className="font-medium text-heading">Logo URL</span>
                <input
                  className="input-base"
                  value={formState.logoUrl}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, logoUrl: event.target.value }))
                  }
                  placeholder="https://example.org/logo.png"
                />
              </label>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSubmit}
                  className="btn-base bg-org text-white disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="btn-base btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Representative
                </p>
                <p className="mt-1 text-base font-medium text-heading">
                  {currentUser?.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Email
                </p>
                <p className="mt-1 text-base font-medium text-heading">
                  {currentUser?.email ?? "Not provided"}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Location
                </p>
                <p className="mt-1 text-base font-medium text-heading">
                  {formState.location || currentUser?.location || "Not provided"}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Description
                </p>
                <p className="mt-1 text-sm leading-7 text-text">
                  {formState.description || "No organization description yet."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Website
                </p>
                <p className="mt-1 text-base font-medium text-heading">
                  {formState.website || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Logo URL
                </p>
                <p className="mt-1 text-base font-medium text-heading line-clamp-1">
                  {formState.logoUrl || "Not provided"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
