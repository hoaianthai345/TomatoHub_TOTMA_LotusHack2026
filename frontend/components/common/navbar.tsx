"use client";

import Link from "next/link";
import Image from "next/image";
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
  const profileHref =
    currentUser?.role === "organization" ? "/organization" : "/supporter";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur">
      <Container className="relative flex h-16 items-center">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo.svg"
              alt="TomatoHub"
              width={160}
              height={36}
              className="h-9 w-auto md:h-10"
              priority
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-primary/80 lg:inline-block">
              Relief Network
            </span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
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

        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          {isAuthenticated ? (
            <>
              <div className="group relative">
                <button
                  type="button"
                  className="btn-base btn-secondary !px-4 py-2 text-sm font-medium"
                >
                  Profile
                </button>

                <div className="pointer-events-none invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                  <div className="shadow-popover-token w-56 rounded-xl border border-border bg-white p-2">
                    <div className="rounded-lg bg-surface-light px-3 py-2">
                      <p className="text-sm font-semibold text-heading">{displayName}</p>
                      <p className="text-xs capitalize text-text-muted">{currentUser?.role}</p>
                    </div>
                    <Link
                      href={profileHref}
                      className="mt-2 block rounded-lg px-3 py-2 text-sm font-medium text-text transition hover:bg-surface-light"
                    >
                      Open dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition hover:bg-danger/10"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
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

