/**
 * Centralized Mock Data Export
 * Import all mock data from this single file for consistency
 *
 * Example:
 *   import { supporters, organizations, campaigns, donations } from "@/mocks"
 *   import { allMockUsers, mockSupporterUser } from "@/mocks/users"
 */

// Users (Auth & Dashboard)
export {
  mockSupporterUser,
  mockSupporterUser2,
  mockOrganizationUser,
  mockOrganizationUser2,
  mockGuestUser,
  allMockUsers,
  supporters,
  organizations,
} from "./users";

// Campaigns
export { campaigns } from "./campaigns";

// Donations
export { donations } from "./donations";

// Beneficiaries
export { beneficiaries } from "./beneficiaries";

// Transparency
export { transparencyLogs } from "./transparency";

