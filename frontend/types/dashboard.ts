import type { CampaignSupportType } from "./campaign";

export interface SupporterParticipationCard {
  id: string;
  campaignId: string;
  campaignTitle: string;
  campaignLocation: string;
  coverImage: string;
  roleLabel: string;
  statusLabel: string;
  nextStep: string;
  dateLabel: string;
}

export interface SupporterContributionItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  contributionType: CampaignSupportType;
  summary: string;
  statusLabel: string;
  dateLabel: string;
}

export interface SupporterTaskItem {
  id: string;
  campaignId: string;
  campaignTitle: string;
  title: string;
  statusLabel: string;
  dueLabel: string;
}

export interface OrganizationCampaignSnapshot {
  id: string;
  campaignId: string;
  campaignTitle: string;
  location: string;
  statusLabel: string;
  supportLabel: string;
  progressPercent: number;
  note: string;
}

export interface OrganizationActivityItem {
  id: string;
  actor: string;
  title: string;
  detail: string;
  timeLabel: string;
}

export interface OrganizationDashboard {
  organizationId: string;
  campaigns: number;
  beneficiaries: number;
  supporters: number;
  donations: number;
  totalRaised: number;
  campaignSnapshots: OrganizationCampaignSnapshot[];
  recentActivities: OrganizationActivityItem[];
}

export interface SupporterDashboard {
  userId: string;
  activeCampaigns: number;
  totalContributions: number;
  totalDonatedAmount: number;
  myRegistrations: number;
  tasksCompleted: number;
  participationCards: SupporterParticipationCard[];
  contributionItems: SupporterContributionItem[];
  taskItems: SupporterTaskItem[];
}
