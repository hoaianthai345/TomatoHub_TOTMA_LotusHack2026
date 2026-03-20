import type {
  CurrentUser,
  LoginPayload,
  OrganizationSignupPayload,
  SupporterSignupPayload,
} from "@/types/user";

export type {
  CurrentUser,
  LoginPayload,
  OrganizationSignupPayload,
  SupportType,
  SupporterSignupDraft,
  SupporterSignupPayload,
  UserRole,
} from "@/types/user";

export interface AuthContextType {
  currentUser: CurrentUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<CurrentUser>;
  logout: () => void;
  signupSupporter: (payload: SupporterSignupPayload) => Promise<CurrentUser>;
  signupOrganization: (payload: OrganizationSignupPayload) => Promise<CurrentUser>;
  refreshCurrentUser: () => Promise<void>;
  isAuthenticated: boolean;
}
