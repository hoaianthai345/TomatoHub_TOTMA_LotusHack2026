/**
 * Centralized Mock Data for TomatoHub
 * All mock users, supporters, and organizations in one place
 * This is the single source of truth for mock data
 */

import type { CurrentUser } from "@/types/user";
import type { Supporter } from "@/types/supporter";
import type { Organization } from "@/types/organization";

/* ==================== USERS (For Auth) ==================== */

export const mockSupporterUser: CurrentUser = {
  id: "sup-1",
  name: "Mai Giang",
  role: "supporter",
  email: "mai.giang@example.com",
  location: "Thu Duc, HCMC",
  supportTypes: ["donor_money", "volunteer"],
};

export const mockSupporterUser2: CurrentUser = {
  id: "sup-2",
  name: "Nguyen Tuan",
  role: "supporter",
  email: "nguyen.tuan@example.com",
  location: "District 1, HCMC",
  supportTypes: ["donor_goods", "coordinator"],
};

export const mockOrganizationUser: CurrentUser = {
  id: "org-1",
  name: "Tomato Relief Network",
  role: "organization",
  email: "info@tomatorelief.org",
  location: "Thu Duc, HCMC",
};

export const mockOrganizationUser2: CurrentUser = {
  id: "org-2",
  name: "Community Aid Foundation",
  role: "organization",
  email: "contact@communityaid.org",
  location: "District 5, HCMC",
};

export const mockGuestUser: CurrentUser | null = null;

/**
 * All users lookup database
 */
export const allMockUsers: Record<string, CurrentUser> = {
  [mockSupporterUser.id]: mockSupporterUser,
  [mockSupporterUser2.id]: mockSupporterUser2,
  [mockOrganizationUser.id]: mockOrganizationUser,
  [mockOrganizationUser2.id]: mockOrganizationUser2,
};

/* ==================== SUPPORTERS (For Dashboard) ==================== */

export const supporters: Supporter[] = [
  {
    id: mockSupporterUser.id,
    fullName: mockSupporterUser.name,
    supportTypes: mockSupporterUser.supportTypes ?? [],
    location: mockSupporterUser.location ?? "",
    joinedCampaignIds: ["camp-1"],
  },
  {
    id: mockSupporterUser2.id,
    fullName: mockSupporterUser2.name,
    supportTypes: mockSupporterUser2.supportTypes ?? [],
    location: mockSupporterUser2.location ?? "",
    joinedCampaignIds: ["camp-1", "camp-2"],
  },
];

/* ==================== ORGANIZATIONS (For Dashboard) ==================== */

export const organizations: Organization[] = [
  {
    id: mockOrganizationUser.id,
    name: mockOrganizationUser.name,
    description:
      "Community-led organization coordinating local aid campaigns.",
    verified: true,
    logoUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=200&q=80",
    location: mockOrganizationUser.location ?? "",
  },
  {
    id: mockOrganizationUser2.id,
    name: mockOrganizationUser2.name,
    description: "Foundation focused on community development and aid.",
    verified: true,
    logoUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&q=80",
    location: mockOrganizationUser2.location ?? "",
  },
];
