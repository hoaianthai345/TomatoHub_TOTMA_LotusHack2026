/**
 * Auth Constants
 * Storage keys and default values for auth system
 */

export const AUTH_TOKEN_STORAGE_KEY = "tomatohub_auth_token";
export const AUTH_USER_STORAGE_KEY = "tomatohub_auth_user";
export const AUTH_STORAGE_ROLE_KEY = "tomatohub_auth_role";
export const AUTH_TOKEN_COOKIE_KEY = "tomatohub_auth_token";
export const AUTH_ROLE_COOKIE_KEY = "tomatohub_auth_role";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const AUTH_ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  SIGNUP_SUPPORTER: "/signup/supporter",
  SIGNUP_SUPPORTER_SUPPORT_TYPES: "/signup/supporter/support-types",
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
  "/organizations",
  "/organizations/[id]",
  "/donate",
  "/transparency",
  "/login",
  "/signup",
  "/signup/supporter",
  "/signup/supporter/support-types",
  "/signup/organization",
  "/images",
  "/favicon.ico",
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
  "/organization/supporters",
  "/organization/profile",
] as const;
