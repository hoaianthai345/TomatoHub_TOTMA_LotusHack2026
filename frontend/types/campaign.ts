export type SupportType = "donor_money" | "donor_goods" | "volunteer" | "shipper" | "coordinator";

export type CampaignStatus = "draft" | "active" | "completed";

export interface CampaignNeed {
	label: string;
	value: string;
}

export interface CampaignCoordinates {
	latitude: number;
	longitude: number;
}

export interface Campaign {
	id: string;
	slug: string;
	title: string;
	shortDescription: string;
	description: string;
	location: string;
	organizationId: string;
	status: CampaignStatus;
	tags: string[];
	targetAmount?: number;
	raisedAmount?: number;
	beneficiaryCount: number;
	supporterCount: number;
	needs: CampaignNeed[];
	coverImage: string;
	coordinates: CampaignCoordinates;
	createdAt: string;
}
