export interface Organization {
  id: string;
  name: string;
  description?: string;
  verified: boolean;
  creditScore?: number;
  website?: string;
  logoUrl?: string;
  location?: string;
  createdAt?: string;
}
