"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NAV_LINKS } from "@/lib/constants";
import Container from "./container";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const { currentUser, logout, isAuthenticated } = useAuth();
  const displayName =
    currentUser?.role === "organization"
      ? currentUser.organizationName ?? currentUser.name
      : currentUser?.name;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/images/logo.svg"
            alt="TomatoHub"
            style={{ height: "36px", width: "auto" }}
            className="md:h-10"
          />
          <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-primary/80 lg:inline-block">
            Relief Network
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden gap-6 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text transition hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* User Info */}
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-heading">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted capitalize">
                    {currentUser?.role}
                  </p>
                </div>

                {/* Role Badge */}
                <div
                  className={`role-badge ${
                    currentUser?.role === "organization"
                      ? "role-badge-org"
                      : "role-badge-supporter"
                  }`}
                >
                  {currentUser?.role === "organization" ? "ORG" : "SUP"}
                </div>
              </div>

              {/* Dashboard Link */}
              <Link
                href={
                  currentUser?.role === "organization"
                    ? "/organization"
                    : "/supporter"
                }
                className="hidden md:inline-flex px-3 py-1.5 text-sm font-medium text-body bg-surface-light rounded-lg transition"
              >
                Dashboard
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm font-medium text-white bg-danger rounded-lg transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Guest Auth Links */}
              <Link
                href="/login"
                className="hidden md:inline-block px-3 py-1.5 text-sm font-medium text-body hover:text-primary transition"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition"
              >
                Join Now
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}

