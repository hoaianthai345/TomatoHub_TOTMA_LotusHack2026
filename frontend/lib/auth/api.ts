import type {
  CurrentUser,
  LoginPayload,
  OrganizationSignupPayload,
  SupportType,
  SupporterSignupPayload,
  UserRole,
} from "./types";
import { ApiError, requestJson } from "@/lib/api/http";

interface BackendCurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: Exclude<UserRole, "guest">;
  organization_id: string | null;
  organization_name: string | null;
  location: string | null;
  support_types: SupportType[];
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

interface BackendTokenResponse {
  access_token: string;
  token_type: string;
  user: BackendCurrentUser;
}

export { ApiError as AuthApiError };

function mapCurrentUser(user: BackendCurrentUser): CurrentUser {
  return {
    id: user.id,
    name: user.full_name,
    role: user.role,
    email: user.email,
    location: user.location ?? undefined,
    supportTypes: user.support_types ?? [],
    organizationId: user.organization_id ?? undefined,
    organizationName: user.organization_name ?? undefined,
    isSuperuser: user.is_superuser,
    createdAt: user.created_at,
  };
}

export interface AuthSuccessPayload {
  token: string;
  user: CurrentUser;
}

export async function loginApi(payload: LoginPayload): Promise<AuthSuccessPayload> {
  const response = await requestJson<BackendTokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return {
    token: response.access_token,
    user: mapCurrentUser(response.user),
  };
}

export async function signupSupporterApi(
  payload: SupporterSignupPayload
): Promise<AuthSuccessPayload> {
  const response = await requestJson<BackendTokenResponse>("/auth/signup/supporter", {
    method: "POST",
    body: JSON.stringify({
      full_name: payload.name,
      email: payload.email,
      password: payload.password,
      location: payload.location,
      support_types: payload.supportTypes ?? [],
    }),
  });

  return {
    token: response.access_token,
    user: mapCurrentUser(response.user),
  };
}

export async function signupOrganizationApi(
  payload: OrganizationSignupPayload
): Promise<AuthSuccessPayload> {
  const response = await requestJson<BackendTokenResponse>("/auth/signup/organization", {
    method: "POST",
    body: JSON.stringify({
      organization_name: payload.name,
      representative_name: payload.representative,
      email: payload.email,
      password: payload.password,
      location: payload.location,
      description: payload.description,
      website: payload.website,
      logo_url: payload.logoUrl,
    }),
  });

  return {
    token: response.access_token,
    user: mapCurrentUser(response.user),
  };
}

export async function getMeApi(token: string): Promise<CurrentUser> {
  const response = await requestJson<BackendCurrentUser>("/auth/me", {
    method: "GET",
    token,
  });
  return mapCurrentUser(response);
}
