"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import StatusBadge from "@/components/common/status-badge";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/http";
import { getStatusMeta, STATUS_TONE_CLASS } from "@/lib/ui/status";
import {
  listVolunteerRegistrations,
  updateVolunteerRegistrationAttendance,
  updateVolunteerRegistrationStatus,
} from "@/lib/api/volunteer-registrations";
import type {
  VolunteerAttendanceStatus,
  VolunteerRegistration,
  VolunteerRegistrationStatus,
  VolunteerRole,
} from "@/types/volunteer-registration";
import { formatDateTime } from "@/utils/format";

interface CampaignVolunteerCheckinPanelProps {
  campaignId: string;
  campaignOrganizationId: string;
}

const ATTENDANCE_STATUS_OPTIONS: Array<{
  value: VolunteerAttendanceStatus;
  label: string;
  hint: string;
}> = [
  {
    value: "not_marked",
    label: "Not marked",
    hint: "Attendance has not been recorded yet.",
  },
  {
    value: "arrived",
    label: "Arrived",
    hint: "Volunteer has arrived at the campaign location.",
  },
  {
    value: "absent",
    label: "Absent",
    hint: "Volunteer did not attend this campaign shift.",
  },
  {
    value: "left_early",
    label: "Left early",
    hint: "Volunteer left before their shift ended.",
  },
  {
    value: "completed",
    label: "Completed",
    hint: "Volunteer completed the assigned shift.",
  },
];

const REGISTRATION_STATUS_OPTIONS: Array<{
  value: VolunteerRegistrationStatus;
  label: string;
  hint: string;
}> = [
  {
    value: "approved",
    label: "Approved",
    hint: "Volunteer is approved and can be marked for attendance.",
  },
  {
    value: "pending",
    label: "Pending",
    hint: "Volunteer is waiting for review.",
  },
  {
    value: "rejected",
    label: "Rejected",
    hint: "Volunteer is rejected for this campaign.",
  },
];

const VOLUNTEER_ROLE_LABEL: Record<VolunteerRole, string> = {
  packing: "Packing",
  delivery: "Delivery",
  medic: "Medic",
  online: "Online",
};

function volunteerRoleLabel(role?: VolunteerRole): string {
  if (!role) {
    return "Not assigned";
  }
  return VOLUNTEER_ROLE_LABEL[role];
}

function volunteerShiftLabel(item: {
  shiftStartAt?: string;
  shiftEndAt?: string;
}): string {
  if (item.shiftStartAt && item.shiftEndAt) {
    return `${formatDateTime(item.shiftStartAt)} - ${formatDateTime(item.shiftEndAt)}`;
  }
  if (item.shiftStartAt) {
    return `Starts at ${formatDateTime(item.shiftStartAt)}`;
  }
  if (item.shiftEndAt) {
    return `Ends at ${formatDateTime(item.shiftEndAt)}`;
  }
  return "No shift schedule";
}

function registrationSortWeight(status: VolunteerRegistrationStatus): number {
  if (status === "pending") {
    return 0;
  }
  if (status === "approved") {
    return 1;
  }
  if (status === "rejected") {
    return 2;
  }
  return 4;
}

function attendanceSortWeight(status: VolunteerAttendanceStatus): number {
  if (status === "arrived") {
    return 0;
  }
  if (status === "not_marked") {
    return 1;
  }
  if (status === "left_early") {
    return 2;
  }
  if (status === "completed") {
    return 3;
  }
  return 4;
}

function statusToneClass(
  kind: "registration_status" | "attendance_status",
  value: string
): string {
  const tone = getStatusMeta(kind, value).tone;
  return STATUS_TONE_CLASS[tone];
}

function resolveReplacementRegistration(
  latestRegistrations: VolunteerRegistration[],
  selectedRegistration: VolunteerRegistration
): VolunteerRegistration | null {
  const exact = latestRegistrations.find((item) => item.id === selectedRegistration.id);
  if (exact) {
    return exact;
  }

  if (selectedRegistration.userId) {
    const byUser = latestRegistrations.find(
      (item) => item.userId === selectedRegistration.userId
    );
    if (byUser) {
      return byUser;
    }
  }

  const normalizedEmail = selectedRegistration.email.trim().toLowerCase();
  const normalizedName = selectedRegistration.fullName.trim().toLowerCase();
  return (
    latestRegistrations.find((item) => {
      return (
        item.email.trim().toLowerCase() === normalizedEmail &&
        item.fullName.trim().toLowerCase() === normalizedName
      );
    }) ?? null
  );
}

export default function CampaignVolunteerCheckinPanel({
  campaignId,
  campaignOrganizationId,
}: CampaignVolunteerCheckinPanelProps) {
  const { currentUser, accessToken } = useAuth();
  const isOwnerOrg =
    currentUser?.role === "organization" &&
    currentUser.organizationId === campaignOrganizationId &&
    Boolean(accessToken);

  const [registrations, setRegistrations] = useState<VolunteerRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(
    null
  );
  const [savingAttendanceStatus, setSavingAttendanceStatus] = useState(false);
  const [savingRegistrationStatus, setSavingRegistrationStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const registrationList = await listVolunteerRegistrations({
          campaignId,
          limit: 500,
          token: isOwnerOrg ? accessToken ?? undefined : undefined,
        });

        if (!cancelled) {
          setRegistrations(registrationList);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRegistrations([]);
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load volunteer list."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, campaignId, isOwnerOrg]);

  const visibleRegistrations = useMemo(
    () => {
      if (isOwnerOrg) {
        return registrations;
      }

      return registrations.filter(
        (item) => item.status === "approved" || item.status === "pending"
      );
    },
    [isOwnerOrg, registrations]
  );

  const sortedRegistrations = useMemo(
    () =>
      [...visibleRegistrations].sort((left, right) => {
        const byRegistration =
          registrationSortWeight(left.status) - registrationSortWeight(right.status);
        if (byRegistration !== 0) {
          return byRegistration;
        }

        const byAttendance =
          attendanceSortWeight(left.attendanceStatus) -
          attendanceSortWeight(right.attendanceStatus);
        if (byAttendance !== 0) {
          return byAttendance;
        }

        const leftTime = new Date(left.registeredAt).getTime();
        const rightTime = new Date(right.registeredAt).getTime();
        return rightTime - leftTime;
      }),
    [visibleRegistrations]
  );

  const selectedRegistration = useMemo(
    () => sortedRegistrations.find((item) => item.id === selectedRegistrationId) ?? null,
    [sortedRegistrations, selectedRegistrationId]
  );

  const canUpdateSelectedAttendance =
    selectedRegistration?.status === "approved" ||
    selectedRegistration?.status === "pending";
  const canUpdateSelectedRegistrationStatus =
    selectedRegistration?.status !== "cancelled";
  const isSavingAny = savingAttendanceStatus || savingRegistrationStatus;

  const panelTitle = isOwnerOrg
    ? "Manage Volunteers"
    : currentUser?.role === "supporter"
      ? "Volunteer Participants"
      : "Campaign Volunteer List";

  const panelDescription = isOwnerOrg
    ? "Click a volunteer row to open the popup and manage registration + attendance."
    : "This is the current volunteer list for this campaign.";
  const emptyStateMessage = isOwnerOrg
    ? "No volunteer registrations yet for this campaign."
    : "No approved or pending volunteers yet for this campaign.";

  const modeLabel = isOwnerOrg
    ? "Organization view"
    : currentUser?.role === "supporter"
      ? "Supporter view"
      : "Guest view";

  const openAttendancePopup = (registration: VolunteerRegistration) => {
    if (!isOwnerOrg) {
      return;
    }
    setSelectedRegistrationId(registration.id);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const closeAttendancePopup = () => {
    setSelectedRegistrationId(null);
    setSavingAttendanceStatus(false);
    setSavingRegistrationStatus(false);
  };

  const handleUpdateRegistrationStatus = async (
    status: VolunteerRegistrationStatus
  ) => {
    if (!selectedRegistration || !accessToken || !isOwnerOrg) {
      return;
    }

    if (!canUpdateSelectedRegistrationStatus) {
      setErrorMessage(
        "Registration status cannot be updated for cancelled registrations."
      );
      return;
    }

    if (selectedRegistration.status === status) {
      return;
    }

    setSavingRegistrationStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let updatedRegistration: VolunteerRegistration;
      try {
        updatedRegistration = await updateVolunteerRegistrationStatus(
          {
            registrationId: selectedRegistration.id,
            status,
          },
          accessToken
        );
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error;
        }

        const latestRegistrations = await listVolunteerRegistrations({
          campaignId,
          limit: 500,
          token: accessToken,
        });
        setRegistrations(latestRegistrations);

        const replacement = resolveReplacementRegistration(
          latestRegistrations,
          selectedRegistration
        );

        if (!replacement) {
          throw new ApiError(
            "Volunteer record was not found. Please refresh and try again.",
            404
          );
        }

        updatedRegistration = await updateVolunteerRegistrationStatus(
          {
            registrationId: replacement.id,
            status,
          },
          accessToken
        );
      }

      setRegistrations((previous) =>
        previous.map((item) =>
          item.id === updatedRegistration.id ? updatedRegistration : item
        )
      );

      setSuccessMessage(
        `Registration status updated for ${updatedRegistration.fullName} (${updatedRegistration.status}).`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Failed to update registration status."
      );
    } finally {
      setSavingRegistrationStatus(false);
    }
  };

  const handleUpdateAttendanceStatus = async (
    attendanceStatus: VolunteerAttendanceStatus
  ) => {
    if (!selectedRegistration || !accessToken || !isOwnerOrg) {
      return;
    }

    if (!canUpdateSelectedAttendance) {
      setErrorMessage(
        "Attendance cannot be updated for rejected or cancelled registrations."
      );
      return;
    }

    if (selectedRegistration.attendanceStatus === attendanceStatus) {
      return;
    }

    setSavingAttendanceStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let updatedRegistration: VolunteerRegistration;
      try {
        updatedRegistration = await updateVolunteerRegistrationAttendance(
          {
            registrationId: selectedRegistration.id,
            attendanceStatus,
          },
          accessToken
        );
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) {
          throw error;
        }

        const latestRegistrations = await listVolunteerRegistrations({
          campaignId,
          limit: 500,
          token: accessToken,
        });
        setRegistrations(latestRegistrations);

        const replacement = resolveReplacementRegistration(
          latestRegistrations,
          selectedRegistration
        );

        if (!replacement) {
          throw new ApiError(
            "Volunteer record was not found. Please refresh and try again.",
            404
          );
        }

        updatedRegistration = await updateVolunteerRegistrationAttendance(
          {
            registrationId: replacement.id,
            attendanceStatus,
          },
          accessToken
        );
      }

      setRegistrations((previous) =>
        previous.map((item) =>
          item.id === updatedRegistration.id ? updatedRegistration : item
        )
      );
      setSuccessMessage(`Attendance updated for ${updatedRegistration.fullName}.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setErrorMessage(
          "Attendance endpoint returned 404. Please restart backend and try again."
        );
      } else {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "Failed to update attendance status."
        );
      }
    } finally {
      setSavingAttendanceStatus(false);
    }
  };

  return (
    <section className="mt-8 card-base p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-heading">{panelTitle}</h2>
          <p className="mt-1 text-sm text-text-muted">{panelDescription}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isOwnerOrg
              ? "border border-success/30 bg-success/10 text-success"
              : "border border-border bg-surface-muted text-text-muted"
          }`}
        >
          {modeLabel}
        </span>
      </div>

      {errorMessage ? (
        <StatePanel variant="error" className="mt-4" message={errorMessage} />
      ) : null}
      {successMessage ? (
        <StatePanel variant="success" className="mt-4" message={successMessage} />
      ) : null}

      {loading ? (
        <StatePanel variant="loading" className="mt-4" message="Loading volunteer list..." />
      ) : null}

      {!loading && sortedRegistrations.length === 0 ? (
        <StatePanel
          variant="empty"
          className="mt-4"
          message={emptyStateMessage}
        />
      ) : null}

      {!loading && sortedRegistrations.length > 0 && isOwnerOrg ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-surface-muted text-text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Volunteer</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                <th className="px-4 py-3 font-semibold">Registration</th>
                <th className="px-4 py-3 font-semibold">Attendance</th>
                <th className="px-4 py-3 font-semibold">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {sortedRegistrations.map((registration) => (
                <tr
                  key={registration.id}
                  className="cursor-pointer border-t border-border hover:bg-surface-light"
                  onClick={() => {
                    openAttendancePopup(registration);
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-heading">{registration.fullName}</p>
                    <p className="text-xs text-text-muted">{registration.email}</p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {volunteerRoleLabel(registration.role)}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {volunteerShiftLabel(registration)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      kind="registration_status"
                      value={registration.status}
                      size={14}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      kind="attendance_status"
                      value={registration.attendanceStatus}
                      size={14}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {registration.attendanceMarkedAt
                      ? formatDateTime(registration.attendanceMarkedAt)
                      : <MissingValue text="N/A" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && sortedRegistrations.length > 0 && !isOwnerOrg ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {sortedRegistrations.map((registration) => (
            <article
              key={registration.id}
              className="rounded-xl border border-border bg-surface-light p-4"
            >
              <p className="font-medium text-heading">{registration.fullName}</p>
              <p className="mt-1 text-xs text-text-muted">
                {volunteerRoleLabel(registration.role)}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {volunteerShiftLabel(registration)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge
                  kind="registration_status"
                  value={registration.status}
                  size={14}
                />
                <StatusBadge
                  kind="attendance_status"
                  value={registration.attendanceStatus}
                  size={14}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {selectedRegistration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-heading">Manage volunteer status</h3>
                <p className="mt-1 text-sm text-text-muted">{selectedRegistration.fullName}</p>
                <p className="text-xs text-text-muted">
                  {volunteerRoleLabel(selectedRegistration.role)} |{" "}
                  {volunteerShiftLabel(selectedRegistration)}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted hover:bg-surface-muted"
                onClick={closeAttendancePopup}
                disabled={isSavingAny}
                aria-label="Close popup"
                title="Close"
              >
                <X className="icon-16" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge
                kind="registration_status"
                value={selectedRegistration.status}
                size={14}
              />
              <StatusBadge
                kind="attendance_status"
                value={selectedRegistration.attendanceStatus}
                size={14}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-heading">Registration status</p>
              <div className="flex flex-wrap gap-2">
                {REGISTRATION_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`badge-base px-3 py-1.5 text-xs transition ${
                      selectedRegistration.status === option.value
                        ? statusToneClass("registration_status", option.value)
                        : "border border-border bg-white text-text-muted hover:bg-surface-muted"
                    }`}
                    onClick={() => {
                      void handleUpdateRegistrationStatus(option.value);
                    }}
                    title={option.hint}
                    disabled={
                      isSavingAny ||
                      !canUpdateSelectedRegistrationStatus ||
                      selectedRegistration.status === option.value
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {!canUpdateSelectedRegistrationStatus ? (
              <StatePanel
                variant="warning"
                className="mt-3"
                message="Registration status cannot be updated for cancelled registrations."
              />
            ) : null}

            {!canUpdateSelectedAttendance ? (
              <StatePanel
                variant="warning"
                className="mt-3"
                message="Attendance can only be updated when registration status is approved or pending."
              />
            ) : null}

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-heading">Attendance status</p>
              <div className="flex flex-wrap gap-2">
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`badge-base px-3 py-1.5 text-xs transition ${
                      selectedRegistration.attendanceStatus === option.value
                        ? statusToneClass("attendance_status", option.value)
                        : "border border-border bg-white text-text-muted hover:bg-surface-muted"
                    }`}
                    onClick={() => {
                      void handleUpdateAttendanceStatus(option.value);
                    }}
                    title={option.hint}
                    disabled={
                      isSavingAny ||
                      !canUpdateSelectedAttendance ||
                      selectedRegistration.attendanceStatus === option.value
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </section>
  );
}
