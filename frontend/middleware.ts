import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  PUBLIC_ROUTES,
  SUPPORTER_ROUTES,
  ORG_ROUTES,
  AUTH_STORAGE_KEY,
  AUTH_ROUTES,
} from "@/lib/auth/constants";
import { allMockUsers } from "@/lib/auth/mockUsers";

/**
 * Middleware to protect routes based on user role
 * This checks if a user is authenticated and has access to the requested route
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get stored user ID from cookie/header
  const authCookie = request.cookies.get(AUTH_STORAGE_KEY)?.value;

  // For localStorage (client-side) simulation, we'll pass through
  // and let client-side auth handle redirects
  // In production, use secure cookies instead

  // Public routes - always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check localStorage via headers (this is a limitation of middleware)
  // In production, use proper server-side session management
  if (!authCookie) {
    // No auth cookie, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = allMockUsers[authCookie];

  if (!user) {
    // Invalid user, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check route access based on role
  if (user.role === "supporter" && !isSupporterRoute(pathname)) {
    if (isOrgRoute(pathname)) {
      return NextResponse.redirect(new URL("/supporter", request.url));
    }
    if (!isPublicRoute(pathname)) {
      return NextResponse.redirect(new URL("/supporter", request.url));
    }
  }

  if (user.role === "organization" && !isOrgRoute(pathname)) {
    if (isSupporterRoute(pathname)) {
      return NextResponse.redirect(new URL("/organization", request.url));
    }
    if (!isPublicRoute(pathname)) {
      return NextResponse.redirect(new URL("/organization", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Check if a route is public (guest accessible)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === pathname) return true;
    // Handle [id] or [slug] dynamic routes
    if (route.includes("[")) {
      const pattern = route.replace(/\[.*?\]/g, "[^/]+");
      return new RegExp(`^${pattern}/?$`).test(pathname);
    }
    return false;
  });
}

/**
 * Check if a route is supporter-only
 */
function isSupporterRoute(pathname: string): boolean {
  return SUPPORTER_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a route is organization-only
 */
function isOrgRoute(pathname: string): boolean {
  return ORG_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Configure which routes this middleware runs on
 * We want to protect all routes except public ones
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
