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
  created_at: string;
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
    createdAt: item.created_at,
  };
}

export async function getOrganizationById(organizationId: string): Promise<Organization> {
  const organization = await requestJson<BackendOrganization>(
    `/organizations/${encodeURIComponent(organizationId)}`
  );

  return mapOrganization(organization);
}
