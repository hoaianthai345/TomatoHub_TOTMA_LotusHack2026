export type BeneficiaryStatus =
  | "added"
  | "verified"
  | "assigned"
  | "received";

export interface Beneficiary {
  id: string;
  fullName: string;
  location: string;
  campaignId?: string;
  status: BeneficiaryStatus;
  category?: string;
  targetSupportAmount?: number;
  isVerified?: boolean;
  createdAt?: string;
}
