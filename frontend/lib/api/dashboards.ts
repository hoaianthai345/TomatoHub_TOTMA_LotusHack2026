import type {
  OrganizationDashboard,
  SupporterDashboard,
} from "@/types/dashboard";
import { requestJson } from "./http";

type ApiDecimal = string | number;

interface BackendOrganizationDashboard {
  organization_id: string;
  campaigns: number;
  beneficiaries: number;
  supporters: number;
  donations: number;
  total_raised: ApiDecimal;
}

interface BackendSupporterDashboard {
  user_id: string;
  active_campaigns: number;
  total_contributions: number;
  total_donated_amount: ApiDecimal;
  my_registrations: number;
  tasks_completed: number;
}

function toNumber(value: ApiDecimal): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getOrganizationDashboard(
  organizationId: string,
  token?: string
): Promise<OrganizationDashboard> {
  const dashboard = await requestJson<BackendOrganizationDashboard>(
    `/dashboards/organization/${encodeURIComponent(organizationId)}`,
    { token }
  );

  return {
    organizationId: dashboard.organization_id,
    campaigns: dashboard.campaigns,
    beneficiaries: dashboard.beneficiaries,
    supporters: dashboard.supporters,
    donations: dashboard.donations,
    totalRaised: toNumber(dashboard.total_raised),
  };
}

export async function getSupporterDashboard(
  userId: string,
  token?: string
): Promise<SupporterDashboard> {
  const dashboard = await requestJson<BackendSupporterDashboard>(
    `/dashboards/supporter/${encodeURIComponent(userId)}`,
    { token }
  );

  return {
    userId: dashboard.user_id,
    activeCampaigns: dashboard.active_campaigns,
    totalContributions: dashboard.total_contributions,
    totalDonatedAmount: toNumber(dashboard.total_donated_amount),
    myRegistrations: dashboard.my_registrations,
    tasksCompleted: dashboard.tasks_completed,
  };
}
