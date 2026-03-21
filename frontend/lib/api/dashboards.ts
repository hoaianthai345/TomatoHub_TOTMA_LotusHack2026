import type {
  OrganizationActivityItem,
  OrganizationCampaignSnapshot,
  OrganizationDashboard,
  SupporterContributionItem,
  SupporterDashboard,
  SupporterParticipationCard,
  SupporterTaskItem,
} from "@/types/dashboard";
import { requestJson } from "./http";

type ApiDecimal = string | number;

const DEFAULT_COVER_IMAGE =
  "/images/campaigns/default-cover.svg";

interface BackendSupporterParticipationCard {
  id: string;
  campaign_id: string;
  campaign_title: string;
  campaign_location: string;
  cover_image_url: string | null;
  role_label: string;
  status_label: string;
  next_step: string;
  date_label: string;
}

interface BackendSupporterContributionItem {
  id: string;
  campaign_id: string;
  campaign_title: string;
  contribution_type: SupporterContributionItem["contributionType"];
  summary: string;
  status_label: string;
  date_label: string;
}

interface BackendSupporterTaskItem {
  id: string;
  campaign_id: string;
  campaign_title: string;
  title: string;
  status_label: string;
  due_label: string;
}

interface BackendOrganizationCampaignSnapshot {
  id: string;
  campaign_id: string;
  campaign_title: string;
  location: string;
  status_label: string;
  support_label: string;
  progress_percent: number;
  note: string;
}

interface BackendOrganizationActivityItem {
  id: string;
  actor: string;
  title: string;
  detail: string;
  time_label: string;
}

interface BackendOrganizationDashboard {
  organization_id: string;
  campaigns: number;
  beneficiaries: number;
  supporters: number;
  donations: number;
  total_raised: ApiDecimal;
  campaign_snapshots: BackendOrganizationCampaignSnapshot[];
  recent_activities: BackendOrganizationActivityItem[];
}

interface BackendSupporterDashboard {
  user_id: string;
  active_campaigns: number;
  total_contributions: number;
  total_donated_amount: ApiDecimal;
  my_registrations: number;
  tasks_completed: number;
  participation_cards: BackendSupporterParticipationCard[];
  contribution_items: BackendSupporterContributionItem[];
  task_items: BackendSupporterTaskItem[];
}

function toNumber(value: ApiDecimal): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapSupporterParticipationCard(
  item: BackendSupporterParticipationCard
): SupporterParticipationCard {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    campaignTitle: item.campaign_title,
    campaignLocation: item.campaign_location,
    coverImage: item.cover_image_url ?? DEFAULT_COVER_IMAGE,
    roleLabel: item.role_label,
    statusLabel: item.status_label,
    nextStep: item.next_step,
    dateLabel: item.date_label,
  };
}

function mapSupporterContributionItem(
  item: BackendSupporterContributionItem
): SupporterContributionItem {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    campaignTitle: item.campaign_title,
    contributionType: item.contribution_type,
    summary: item.summary,
    statusLabel: item.status_label,
    dateLabel: item.date_label,
  };
}

function mapSupporterTaskItem(item: BackendSupporterTaskItem): SupporterTaskItem {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    campaignTitle: item.campaign_title,
    title: item.title,
    statusLabel: item.status_label,
    dueLabel: item.due_label,
  };
}

function mapOrganizationCampaignSnapshot(
  item: BackendOrganizationCampaignSnapshot
): OrganizationCampaignSnapshot {
  return {
    id: item.id,
    campaignId: item.campaign_id,
    campaignTitle: item.campaign_title,
    location: item.location,
    statusLabel: item.status_label,
    supportLabel: item.support_label,
    progressPercent: item.progress_percent,
    note: item.note,
  };
}

function mapOrganizationActivityItem(
  item: BackendOrganizationActivityItem
): OrganizationActivityItem {
  return {
    id: item.id,
    actor: item.actor,
    title: item.title,
    detail: item.detail,
    timeLabel: item.time_label,
  };
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
    campaignSnapshots: (dashboard.campaign_snapshots ?? []).map(
      mapOrganizationCampaignSnapshot
    ),
    recentActivities: (dashboard.recent_activities ?? []).map(
      mapOrganizationActivityItem
    ),
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
    participationCards: (dashboard.participation_cards ?? []).map(
      mapSupporterParticipationCard
    ),
    contributionItems: (dashboard.contribution_items ?? []).map(
      mapSupporterContributionItem
    ),
    taskItems: (dashboard.task_items ?? []).map(mapSupporterTaskItem),
  };
}
