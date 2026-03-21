import type { Organization } from "@/types/organization";
import { requestJson } from "./http";

interface BackendOrganization {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  logo_url: string | null;
  verified: boolean;
  credit_score: number;
  created_at: string;
}

interface ListOrganizationsOptions {
  limit?: number;
}

const ORGANIZATION_LIST_LIMIT_DEFAULT = 50;
const ORGANIZATION_LIST_LIMIT_MIN = 1;
const ORGANIZATION_LIST_LIMIT_MAX = 500;

function normalizeOrganizationLimit(limit?: number): number {
  const requestedLimit = limit ?? ORGANIZATION_LIST_LIMIT_DEFAULT;

  return Number.isFinite(requestedLimit)
    ? Math.min(
        ORGANIZATION_LIST_LIMIT_MAX,
        Math.max(ORGANIZATION_LIST_LIMIT_MIN, Math.trunc(requestedLimit))
      )
    : ORGANIZATION_LIST_LIMIT_DEFAULT;
}

function mapOrganization(item: BackendOrganization): Organization {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    website: item.website ?? undefined,
    location: item.location ?? undefined,
    logoUrl: item.logo_url ?? undefined,
    verified: item.verified,
    creditScore: item.credit_score,
    createdAt: item.created_at,
  };
}

export async function listOrganizations(
  options: ListOrganizationsOptions = {}
): Promise<Organization[]> {
  const query = new URLSearchParams({
    limit: String(normalizeOrganizationLimit(options.limit)),
  });

  const organizations = await requestJson<BackendOrganization[]>(
    `/organizations/?${query.toString()}`
  );

  return organizations.map(mapOrganization);
}

export async function getOrganizationById(organizationId: string): Promise<Organization> {
  const organization = await requestJson<BackendOrganization>(
    `/organizations/${encodeURIComponent(organizationId)}`
  );

  return mapOrganization(organization);
}
