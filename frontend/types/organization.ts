export interface Organization {
  id: string;
  name: string;
  description?: string;
  verified: boolean;
  website?: string;
  logoUrl?: string;
  location?: string;
  createdAt?: string;
}
