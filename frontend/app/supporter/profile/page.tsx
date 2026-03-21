"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import {
  AuthApiError,
  updateSupporterProfileApi,
} from "@/lib/auth/api";
import {
  getSupportTypeLabel,
  SUPPORT_TYPE_OPTIONS,
} from "@/lib/auth/supportTypes";
import type { SupportType } from "@/types/user";

interface ProfileFormState {
  name: string;
  location: string;
  supportTypes: SupportType[];
}

function buildInitialState(
  name: string | undefined,
  location: string | undefined,
  supportTypes: SupportType[] | undefined
): ProfileFormState {
  return {
    name: name ?? "",
    location: location ?? "",
    supportTypes: supportTypes ?? [],
  };
}

export default function SupporterProfilePage() {
  const { currentUser, accessToken, refreshCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(
    buildInitialState(undefined, undefined, undefined)
  );

  useEffect(() => {
    if (!currentUser || isEditing) {
      return;
    }
    setFormState(
      buildInitialState(
        currentUser.name,
        currentUser.location,
        currentUser.supportTypes
      )
    );
  }, [currentUser, isEditing]);

  const canSubmit = useMemo(
    () => formState.name.trim().length >= 2 && !isSaving,
    [formState.name, isSaving]
  );

  const handleToggleSupportType = (type: SupportType) => {
    setFormState((prev) => ({
      ...prev,
      supportTypes: prev.supportTypes.includes(type)
        ? prev.supportTypes.filter((item) => item !== type)
        : [...prev.supportTypes, type],
    }));
  };

  const handleCancel = () => {
    setFormState(
      buildInitialState(
        currentUser?.name,
        currentUser?.location,
        currentUser?.supportTypes
      )
    );
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!accessToken) {
      setErrorMessage("Supporter authentication is required to update profile.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateSupporterProfileApi(
        {
          name: formState.name.trim(),
          location: formState.location.trim() || undefined,
          supportTypes: formState.supportTypes,
        },
        accessToken
      );
      await refreshCurrentUser();
      setSuccessMessage("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(
        error instanceof AuthApiError
          ? error.message
          : "Failed to update supporter profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleGate role="supporter" loadingMessage="Loading supporter profile...">
      <div className="space-y-6 p-6">
        <div className="card-base overflow-hidden border border-supporter/20 bg-[linear-gradient(130deg,_rgba(234,88,12,0.14),_rgba(255,255,255,0.98))]">
          <div className="grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-supporter">
                Supporter Profile
              </p>
              <h1 className="mt-2 text-3xl font-bold text-heading">
                {currentUser?.name}
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Keep your details updated so organizations can match your support faster.
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
                className="btn-base bg-supporter text-white"
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

        <div className="card-base max-w-3xl p-6">
          {isEditing ? (
            <div className="space-y-5">
              <label className="grid gap-2 text-sm text-text">
                <span className="font-medium text-heading">Full name</span>
                <input
                  className="input-base"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Your full name"
                />
              </label>

              <label className="grid gap-2 text-sm text-text">
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

              <div className="grid gap-2">
                <p className="text-sm font-medium text-heading">Support types</p>
                <div className="flex flex-wrap gap-3">
                  {SUPPORT_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={formState.supportTypes.includes(option.value)}
                        onChange={() => handleToggleSupportType(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSubmit}
                  className="btn-base bg-supporter text-white disabled:opacity-60"
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
            <div className="grid gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Email
                </p>
                <p className="mt-1 text-base font-medium text-heading">
                  {currentUser?.email ?? "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Location
                </p>
                <p className="mt-1 text-base font-medium text-heading">
                  {currentUser?.location || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Support types
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentUser?.supportTypes && currentUser.supportTypes.length > 0 ? (
                    currentUser.supportTypes.map((type) => (
                      <span key={type} className="badge-base badge-supporter">
                        {getSupportTypeLabel(type)}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted">
                      No support preferences selected yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
