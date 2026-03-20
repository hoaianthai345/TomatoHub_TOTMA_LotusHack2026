/**
 * Auth Library Exports
 * Export all auth-related utilities and components
 */

export { AuthProvider, AuthContext } from "./AuthContext";
export { useAuth } from "./useAuth";
export type {
  AuthContextType,
  CurrentUser,
  LoginPayload,
  OrganizationSignupPayload,
  SupporterSignupPayload,
  SupportType,
  UserRole,
} from "./types";
export {
  AUTH_COOKIE_MAX_AGE,
  AUTH_ROLE_COOKIE_KEY,
  AUTH_STORAGE_ROLE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  SUPPORTER_ROUTES,
  ORG_ROUTES,
} from "./constants";
