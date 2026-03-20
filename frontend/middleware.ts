import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AUTH_ROLE_COOKIE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  ORG_ROUTES,
  PUBLIC_ROUTES,
  SUPPORTER_ROUTES,
} from "@/lib/auth/constants";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE_KEY)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE_KEY)?.value as
    | "supporter"
    | "organization"
    | undefined;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (!authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role === "supporter" && isOrgRoute(pathname)) {
    return NextResponse.redirect(new URL("/supporter", request.url));
  }

  if (role === "organization" && isSupporterRoute(pathname)) {
    return NextResponse.redirect(new URL("/organization", request.url));
  }

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === pathname) return true;
    if (route.includes("[")) {
      const pattern = route.replace(/\[.*?\]/g, "[^/]+");
      return new RegExp(`^${pattern}/?$`).test(pathname);
    }
    return false;
  });
}

function isSupporterRoute(pathname: string): boolean {
  return SUPPORTER_ROUTES.some((route) => pathname.startsWith(route));
}

function isOrgRoute(pathname: string): boolean {
  return ORG_ROUTES.some((route) => pathname.startsWith(route));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
