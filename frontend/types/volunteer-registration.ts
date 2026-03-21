export type VolunteerRegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface VolunteerRegistration {
  id: string;
  campaignId: string;
  userId?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  message?: string;
  status: VolunteerRegistrationStatus;
  registeredAt: string;
}
