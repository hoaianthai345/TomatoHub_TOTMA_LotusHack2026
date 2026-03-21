export type VolunteerRegistrationStatus = "pending" | "approved" | "rejected";

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
