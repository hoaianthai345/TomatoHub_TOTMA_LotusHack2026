export interface OrganizationDashboard {
  organizationId: string;
  campaigns: number;
  beneficiaries: number;
  supporters: number;
  donations: number;
  totalRaised: number;
}

export interface SupporterDashboard {
  userId: string;
  activeCampaigns: number;
  totalContributions: number;
  totalDonatedAmount: number;
  myRegistrations: number;
  tasksCompleted: number;
}
