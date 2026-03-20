/**
 * Auth Types for TomatoHub MVP
 * Defines user roles, support types, and current user structure
 */

export type UserRole = "guest" | "supporter" | "organization";

export type SupportType =
  | "donor_money"
  | "donor_goods"
  | "volunteer"
  | "shipper"
  | "coordinator";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  location?: string;
  supportTypes?: SupportType[];
}

export interface AuthContextType {
  currentUser: CurrentUser | null;
  isLoading: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  signup: (userData: Partial<CurrentUser>) => Promise<void>;
  isAuthenticated: boolean;
}
