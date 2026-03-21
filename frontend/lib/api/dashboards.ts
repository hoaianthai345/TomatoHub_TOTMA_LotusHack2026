import type {
  OrganizationActivityItem,
  OrganizationCampaignSnapshot,
  OrganizationDashboard,
  SupporterContributionItem,
  SupporterDashboard,
  SupporterParticipationCard,
  SupporterTaskItem,
} from "@/types/dashboard";
import type { Campaign } from "@/types/campaign";
import { formatDateTime } from "@/utils/format";
import { requestJson } from "./http";
import { listPublishedCampaigns } from "./campaigns";
import { listVolunteerRegistrations } from "./volunteer-registrations";

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

function buildFallbackNextStep(status: string): string {
  if (status === "approved") {
    return "Arrive at checkpoint and scan QR to check in.";
  }
  if (status === "pending") {
    return "Wait for organization approval.";
  }
  if (status === "rejected") {
    return "Registration was rejected.";
  }
  if (status === "cancelled") {
    return "Registration was cancelled.";
  }
  return "Follow campaign updates for the next action.";
}

async function buildParticipationCardsFromRegistrations(
  userId: string,
  token?: string
): Promise<SupporterParticipationCard[]> {
  if (!token) {
    return [];
  }

  const [registrations, campaigns] = await Promise.all([
    listVolunteerRegistrations({
      userId,
      token,
      limit: 100,
    }),
    listPublishedCampaigns(100),
  ]);

  if (!registrations.length) {
    return [];
  }

  const campaignById = new Map<string, Campaign>(
    campaigns.map((campaign) => [campaign.id, campaign])
  );

  return registrations.slice(0, 10).map((registration) => {
    const campaign = campaignById.get(registration.campaignId);
    return {
      id: `volunteer-${registration.id}`,
      campaignId: registration.campaignId,
      campaignTitle: campaign?.title ?? `Campaign ${registration.campaignId.slice(0, 8)}`,
      campaignLocation: campaign?.location ?? "Location updating",
      coverImage: campaign?.coverImage ?? DEFAULT_COVER_IMAGE,
      roleLabel: "Volunteer",
      statusLabel: registration.status,
      nextStep: buildFallbackNextStep(registration.status),
      dateLabel: formatDateTime(registration.registeredAt),
    };
  });
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

  let participationCards = (dashboard.participation_cards ?? []).map(
    mapSupporterParticipationCard
  );

  if (participationCards.length === 0) {
    try {
      participationCards = await buildParticipationCardsFromRegistrations(
        userId,
        token
      );
    } catch {
      // Keep empty state when fallback data is unavailable.
    }
  }

  return {
    userId: dashboard.user_id,
    activeCampaigns: dashboard.active_campaigns,
    totalContributions: dashboard.total_contributions,
    totalDonatedAmount: toNumber(dashboard.total_donated_amount),
    myRegistrations: dashboard.my_registrations,
    tasksCompleted: dashboard.tasks_completed,
    participationCards,
    contributionItems: (dashboard.contribution_items ?? []).map(
      mapSupporterContributionItem
    ),
    taskItems: (dashboard.task_items ?? []).map(mapSupporterTaskItem),
  };
}
