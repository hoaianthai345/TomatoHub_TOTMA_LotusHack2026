import { campaigns } from "./campaigns";

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
  contributionType: "money" | "goods" | "volunteer";
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

function getCampaignById(campaignId: string) {
  return campaigns.find((campaign) => campaign.id === campaignId) ?? campaigns[0];
}

export function getSupporterParticipationCards(userId?: string): SupporterParticipationCard[] {
  const campaignIds =
    userId === "sup-2" ? ["camp-1", "camp-2", "camp-4"] : ["camp-1", "camp-3", "camp-2"];

  return campaignIds.map((campaignId, index) => {
    const campaign = getCampaignById(campaignId);

    return {
      id: `participation-${campaignId}`,
      campaignId,
      campaignTitle: campaign.title,
      campaignLocation: campaign.location,
      coverImage: campaign.coverImage,
      roleLabel:
        index === 0 ? "Volunteer On-site" : index === 1 ? "Money Donor" : "Logistics Support",
      statusLabel:
        index === 0 ? "Confirmed" : index === 1 ? "Completed" : "Pending Schedule",
      nextStep:
        index === 0
          ? "Check in at the local coordination point before 08:00."
          : index === 1
            ? "Your donation round has been matched to verified households."
            : "Wait for the organizer to assign a delivery window.",
      dateLabel:
        index === 0 ? "Tomorrow, 08:00" : index === 1 ? "2 days ago" : "Awaiting confirmation",
    };
  });
}

export function getSupporterContributionItems(userId?: string): SupporterContributionItem[] {
  const cards = getSupporterParticipationCards(userId);

  return cards.map((item, index) => ({
    id: `contribution-${item.campaignId}`,
    campaignId: item.campaignId,
    campaignTitle: item.campaignTitle,
    contributionType:
      index === 0 ? "volunteer" : index === 1 ? "money" : "goods",
    summary:
      index === 0
        ? "Registered for field support and household delivery coordination."
        : index === 1
          ? "Transferred 1,500,000 VND to the active fundraising round."
          : "Committed 20 food packs for next weekend distribution.",
    statusLabel:
      index === 0 ? "Upcoming" : index === 1 ? "Received" : "Preparing items",
    dateLabel: item.dateLabel,
  }));
}

export function getSupporterTasks(userId?: string): SupporterTaskItem[] {
  const cards = getSupporterParticipationCards(userId);

  return cards.slice(0, 3).map((item, index) => ({
    id: `task-${item.campaignId}`,
    campaignId: item.campaignId,
    campaignTitle: item.campaignTitle,
    title:
      index === 0
        ? "Confirm arrival and pick up volunteer badge"
        : index === 1
          ? "Bring medicine kits to checkpoint B"
          : "Upload delivery confirmation photos",
    statusLabel:
      index === 0 ? "High Priority" : index === 1 ? "Scheduled" : "Waiting Review",
    dueLabel:
      index === 0 ? "Due tomorrow" : index === 1 ? "This weekend" : "After task completion",
  }));
}

export function getOrganizationCampaignSnapshots(
  organizationId?: string
): OrganizationCampaignSnapshot[] {
  const matchingCampaigns = campaigns.filter((campaign) => campaign.organizationId === organizationId);
  const sourceCampaigns = matchingCampaigns.length > 0 ? matchingCampaigns : campaigns.slice(0, 3);

  return sourceCampaigns.map((campaign, index) => ({
    id: `org-campaign-${campaign.id}`,
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    location: campaign.location,
    statusLabel:
      campaign.status === "published" ? "Running" : campaign.status === "draft" ? "Draft" : "Closed",
    supportLabel:
      index === 0
        ? "Volunteer turnout is strong this week."
        : index === 1
          ? "Goods collection needs one more pickup slot."
          : "Fundraising is steady but distribution prep is behind.",
    progressPercent: Math.max(
      12,
      Math.min(
        100,
        Math.round(((campaign.raisedAmount || 0) / (campaign.targetAmount || 1)) * 100)
      )
    ),
    note:
      index === 0
        ? "Prioritize volunteer coordination and beneficiary verification."
        : index === 1
          ? "Push one donor update to accelerate item collection."
          : "Review next-week logistics before publishing a new update.",
  }));
}

export function getOrganizationRecentActivities(
  organizationId?: string
): OrganizationActivityItem[] {
  const snapshots = getOrganizationCampaignSnapshots(organizationId);

  return snapshots.map((item, index) => ({
    id: `org-activity-${item.campaignId}`,
    actor:
      index === 0 ? "Support Team" : index === 1 ? "Finance Desk" : "Field Coordinator",
    title:
      index === 0
        ? "New volunteer confirmations arrived"
        : index === 1
          ? "Donation round reconciled"
          : "Distribution route updated",
    detail:
      index === 0
        ? `Five supporters confirmed participation for ${item.campaignTitle}.`
        : index === 1
          ? `The latest donation batch for ${item.campaignTitle} has been checked and logged.`
          : `Logistics notes were updated for ${item.campaignTitle} in ${item.location}.`,
    timeLabel:
      index === 0 ? "15 minutes ago" : index === 1 ? "2 hours ago" : "Yesterday",
  }));
}
