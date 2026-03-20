/**
 * Auth Constants
 * Storage keys and default values for auth system
 */

export const AUTH_STORAGE_KEY = "tomatohub_auth_user";
export const AUTH_STORAGE_ROLE_KEY = "tomatohub_auth_role";

export const AUTH_ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  SIGNUP_SUPPORTER: "/signup/supporter",
  SIGNUP_ORGANIZATION: "/signup/organization",
  SUPPORTER_DASHBOARD: "/supporter",
  ORG_DASHBOARD: "/organization",
  HOME: "/",
} as const;

/**
 * Public routes accessible to guests
 */
export const PUBLIC_ROUTES = [
  "/",
  "/campaigns",
  "/campaigns/[id]",
  "/donate",
  "/transparency",
  "/login",
  "/signup",
  "/signup/supporter",
  "/signup/organization",
] as const;

/**
 * Supporter-only routes
 */
export const SUPPORTER_ROUTES = [
  "/supporter",
  "/supporter/register",
  "/supporter/contributions",
  "/supporter/registrations",
  "/supporter/tasks",
  "/supporter/profile",
] as const;

/**
 * Organization-only routes
 */
export const ORG_ROUTES = [
  "/organization",
  "/organization/campaigns",
  "/organization/campaigns/create",
  "/organization/beneficiaries",
  "/organization/supporters",
  "/organization/donations",
  "/organization/transparency",
  "/organization/profile",
] as const;
