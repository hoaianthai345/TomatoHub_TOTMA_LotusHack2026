import type {
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
  status: VolunteerRegistrationStatus;
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
  userId?: string;
}

interface UpdateVolunteerRegistrationStatusInput {
  registrationId: string;
  status: VolunteerRegistrationStatus;
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
    status: item.status,
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
