export type CampaignSupportType = "money" | "goods" | "volunteer";

export type CampaignStatus = "draft" | "published" | "closed";

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
	targetAmount: number;
	goalAmount?: number;
	raisedAmount: number;
	beneficiaryCount?: number;
	supporterCount?: number;
	supportTypes?: CampaignSupportType[];
	needs: CampaignNeed[];
	coverImage: string;
	coverImageUrl?: string;
	province?: string;
	district?: string;
	addressLine?: string;
	coordinates: CampaignCoordinates | null;
	mediaUrls?: string[];
	startsAt?: string;
	endsAt?: string;
	isActive?: boolean;
	publishedAt?: string;
	closedAt?: string;
	createdAt: string;
	updatedAt?: string;
}
