import type {
  CurrentUser,
  LoginPayload,
  OrganizationSignupPayload,
  SupportType,
  SupporterSignupPayload,
  UserRole,
} from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

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

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = "Request failed";
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") {
        errorMessage = payload.detail;
      } else if (Array.isArray(payload?.detail) && payload.detail.length > 0) {
        const firstIssue = payload.detail[0];
        if (typeof firstIssue?.msg === "string") {
          errorMessage = firstIssue.msg;
        }
      } else if (typeof payload?.message === "string") {
        errorMessage = payload.message;
      }
    } catch {
      // Ignore parse error and keep default message.
    }
    throw new AuthApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

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
  const response = await request<BackendTokenResponse>("/auth/login", {
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
  const response = await request<BackendTokenResponse>("/auth/signup/supporter", {
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
  const response = await request<BackendTokenResponse>("/auth/signup/organization", {
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
  const response = await request<BackendCurrentUser>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return mapCurrentUser(response);
}
