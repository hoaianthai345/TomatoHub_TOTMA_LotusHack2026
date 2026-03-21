import type { CampaignSupportType } from "@/types/campaign";
import { requestJson } from "./http";

interface CampaignDraftRecommendationRequestPayload {
  title: string;
  campaign_goal: string;
  beneficiary_context?: string;
  location_hint?: string;
  support_types_hint?: CampaignSupportType[];
  constraints?: string[];
  tone?: string;
}

interface BackendCampaignDraftRecommendationResponse {
  short_description: string;
  description: string;
  suggested_tags: string[];
  suggested_support_types: CampaignSupportType[];
  volunteer_tasks: string[];
  donation_suggestions: string[];
  risk_notes: string[];
  transparency_notes: string[];
  generated_by: string;
  model: string | null;
}

export interface CampaignDraftRecommendation {
  shortDescription: string;
  description: string;
  suggestedTags: string[];
  suggestedSupportTypes: CampaignSupportType[];
  volunteerTasks: string[];
  donationSuggestions: string[];
  riskNotes: string[];
  transparencyNotes: string[];
  generatedBy: string;
  model: string | null;
}

function mapCampaignDraftRecommendation(
  response: BackendCampaignDraftRecommendationResponse
): CampaignDraftRecommendation {
  return {
    shortDescription: response.short_description,
    description: response.description,
    suggestedTags: response.suggested_tags ?? [],
    suggestedSupportTypes: response.suggested_support_types ?? [],
    volunteerTasks: response.volunteer_tasks ?? [],
    donationSuggestions: response.donation_suggestions ?? [],
    riskNotes: response.risk_notes ?? [],
    transparencyNotes: response.transparency_notes ?? [],
    generatedBy: response.generated_by,
    model: response.model,
  };
}

export async function generateCampaignDraftRecommendation(
  payload: CampaignDraftRecommendationRequestPayload,
  token: string
): Promise<CampaignDraftRecommendation> {
  const response = await requestJson<BackendCampaignDraftRecommendationResponse>(
    "/recommendations/campaign-draft",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }
  );

  return mapCampaignDraftRecommendation(response);
}

