/**
 * Auth types backed by backend API.
 */

export type UserRole = "guest" | "supporter" | "organization";

export type SupportType =
  | "donor_money"
  | "donor_goods"
  | "volunteer"
  | "shipper"
  | "coordinator";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  location?: string;
  supportTypes?: SupportType[];
  organizationId?: string;
  organizationName?: string;
  isSuperuser?: boolean;
  createdAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SupporterSignupPayload {
  name: string;
  email: string;
  password: string;
  location?: string;
  supportTypes?: SupportType[];
}

export interface OrganizationSignupPayload {
  name: string;
  representative: string;
  email: string;
  password: string;
  location?: string;
  description?: string;
  website?: string;
  logoUrl?: string;
}

export interface AuthContextType {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<CurrentUser>;
  logout: () => void;
  signupSupporter: (payload: SupporterSignupPayload) => Promise<CurrentUser>;
  signupOrganization: (payload: OrganizationSignupPayload) => Promise<CurrentUser>;
  refreshCurrentUser: () => Promise<void>;
  isAuthenticated: boolean;
}
