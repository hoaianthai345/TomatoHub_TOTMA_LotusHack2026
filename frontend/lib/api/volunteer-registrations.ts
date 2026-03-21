import type {
  VolunteerAttendanceStatus,
  VolunteerRole,
  VolunteerRegistration,
  VolunteerRegistrationStatus,
} from "@/types/volunteer-registration";
import { requestJson } from "./http";

interface BackendVolunteerRegistration {
  id: string;
  campaign_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_number: string | null;
  message: string | null;
  role: VolunteerRole | null;
  shift_start_at: string | null;
  shift_end_at: string | null;
  status: VolunteerRegistrationStatus;
  attendance_status: VolunteerAttendanceStatus;
  attendance_note: string | null;
  attendance_marked_at: string | null;
  attendance_marked_by_user_id: string | null;
  registered_at: string;
}

interface ListVolunteerRegistrationsOptions {
  campaignId?: string;
  organizationId?: string;
  userId?: string;
  status?: VolunteerRegistrationStatus;
  limit?: number;
  token?: string;
}

interface CreateVolunteerRegistrationInput {
  campaignId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  message?: string;
  role?: VolunteerRole;
  shiftStartAt?: string;
  shiftEndAt?: string;
  userId?: string;
}

interface QuickJoinVolunteerRegistrationInput {
  campaignId: string;
  phoneNumber?: string;
  message?: string;
  role?: VolunteerRole;
  shiftStartAt?: string;
  shiftEndAt?: string;
}

interface UpdateVolunteerRegistrationStatusInput {
  registrationId: string;
  status: VolunteerRegistrationStatus;
}

interface UpdateVolunteerRegistrationAttendanceInput {
  registrationId: string;
  attendanceStatus: VolunteerAttendanceStatus;
  attendanceNote?: string;
}

function mapVolunteerRegistration(
  item: BackendVolunteerRegistration
): VolunteerRegistration {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    userId: item.user_id ?? undefined,
    fullName: item.full_name,
    email: item.email,
    phoneNumber: item.phone_number ?? undefined,
    message: item.message ?? undefined,
    role: item.role ?? undefined,
    shiftStartAt: item.shift_start_at ?? undefined,
    shiftEndAt: item.shift_end_at ?? undefined,
    status: item.status,
    attendanceStatus: item.attendance_status ?? "not_marked",
    attendanceNote: item.attendance_note ?? undefined,
    attendanceMarkedAt: item.attendance_marked_at ?? undefined,
    attendanceMarkedByUserId: item.attendance_marked_by_user_id ?? undefined,
    registeredAt: item.registered_at,
  };
}

export async function listVolunteerRegistrations({
  campaignId,
  organizationId,
  userId,
  status,
  limit = 200,
  token,
}: ListVolunteerRegistrationsOptions = {}): Promise<VolunteerRegistration[]> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (campaignId) {
    query.set("campaign_id", campaignId);
  }
  if (organizationId) {
    query.set("organization_id", organizationId);
  }
  if (userId) {
    query.set("user_id", userId);
  }
  if (status) {
    query.set("status", status);
  }

  const registrations = await requestJson<BackendVolunteerRegistration[]>(
    `/volunteer-registrations/?${query.toString()}`,
    { token }
  );

  return registrations.map(mapVolunteerRegistration);
}

export async function createVolunteerRegistration(
  payload: CreateVolunteerRegistrationInput,
  token: string
): Promise<VolunteerRegistration> {
  const registration = await requestJson<BackendVolunteerRegistration>(
    "/volunteer-registrations/",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        campaign_id: payload.campaignId,
        user_id: payload.userId,
        full_name: payload.fullName,
        email: payload.email,
        phone_number: payload.phoneNumber,
        message: payload.message,
        role: payload.role,
        shift_start_at: payload.shiftStartAt,
        shift_end_at: payload.shiftEndAt,
      }),
    }
  );

  return mapVolunteerRegistration(registration);
}

export async function quickJoinVolunteerRegistration(
  payload: QuickJoinVolunteerRegistrationInput,
  token: string
): Promise<VolunteerRegistration> {
  const registration = await requestJson<BackendVolunteerRegistration>(
    "/volunteer-registrations/quick-join",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        campaign_id: payload.campaignId,
        phone_number: payload.phoneNumber,
        message: payload.message,
        role: payload.role,
        shift_start_at: payload.shiftStartAt,
        shift_end_at: payload.shiftEndAt,
      }),
    }
  );

  return mapVolunteerRegistration(registration);
}

export async function updateVolunteerRegistrationStatus(
  payload: UpdateVolunteerRegistrationStatusInput,
  token: string
): Promise<VolunteerRegistration> {
  const registration = await requestJson<BackendVolunteerRegistration>(
    `/volunteer-registrations/${encodeURIComponent(payload.registrationId)}/status`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        status: payload.status,
      }),
    }
  );

  return mapVolunteerRegistration(registration);
}

export async function updateVolunteerRegistrationAttendance(
  payload: UpdateVolunteerRegistrationAttendanceInput,
  token: string
): Promise<VolunteerRegistration> {
  const registration = await requestJson<BackendVolunteerRegistration>(
    `/volunteer-registrations/${encodeURIComponent(payload.registrationId)}/attendance`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        attendance_status: payload.attendanceStatus,
        attendance_note: payload.attendanceNote,
      }),
    }
  );

  return mapVolunteerRegistration(registration);
}
