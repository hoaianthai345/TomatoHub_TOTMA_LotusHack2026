/**
 * Auth Library Exports
 * Export all auth-related utilities and components
 */

export { AuthProvider, AuthContext } from "./AuthContext";
export { useAuth } from "./useAuth";
export type { CurrentUser, AuthContextType, UserRole, SupportType } from "./types";
export {
  mockSupporterUser,
  mockSupporterUser2,
  mockOrganizationUser,
  mockOrganizationUser2,
  mockGuestUser,
  allMockUsers,
} from "./mockUsers";
export {
  AUTH_STORAGE_KEY,
  AUTH_STORAGE_ROLE_KEY,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  SUPPORTER_ROUTES,
  ORG_ROUTES,
} from "./constants";
