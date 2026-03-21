export type VolunteerRegistrationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type VolunteerRole = "packing" | "delivery" | "medic" | "online";
export type VolunteerAttendanceStatus =
  | "not_marked"
  | "arrived"
  | "absent"
  | "left_early"
  | "completed";

export interface VolunteerRegistration {
  id: string;
  campaignId: string;
  userId?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  message?: string;
  role?: VolunteerRole;
  shiftStartAt?: string;
  shiftEndAt?: string;
  status: VolunteerRegistrationStatus;
  attendanceStatus: VolunteerAttendanceStatus;
  attendanceNote?: string;
  attendanceMarkedAt?: string;
  attendanceMarkedByUserId?: string;
  registeredAt: string;
}

export interface CampaignVolunteerParticipant {
  fullName: string;
  registrationStatus: VolunteerRegistrationStatus;
  role?: VolunteerRole;
  shiftStartAt?: string;
  shiftEndAt?: string;
  attendanceStatus: VolunteerAttendanceStatus;
  registeredAt: string;
}
