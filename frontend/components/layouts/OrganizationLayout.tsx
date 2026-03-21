"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface OrganizationLayoutProps {
  children: React.ReactNode;
}

/**
 * Organization Layout Component
 * Used for all organization dashboard pages
 * - Left sidebar with navigation
 * - Campaign and operation management links
 * - Profile and settings
 */
export default function OrganizationLayout({
  children,
}: OrganizationLayoutProps) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const sidebarLinks = [
    { label: "Dashboard", href: "/organization" },
    { label: "Campaigns", href: "/organization/campaigns" },
    { label: "Create Campaign", href: "/organization/campaigns/create" },
    { label: "Beneficiaries", href: "/organization/beneficiaries" },
    { label: "Supporters", href: "/organization/supporters" },
    { label: "Donations", href: "/organization/donations" },
    { label: "Transparency", href: "/organization/transparency" },
    { label: "Profile", href: "/organization/profile" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-page">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="card-base h-fit overflow-hidden border border-org/15 bg-white/90 shadow-[0_20px_50px_rgba(124,58,237,0.08)] backdrop-blur lg:sticky lg:top-20">
          <div className="border-b border-border bg-[linear-gradient(135deg,_rgba(124,58,237,0.15),_rgba(255,255,255,0.96))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-org)]">
              Organization Console
            </p>
            <h2 className="mt-2 text-xl font-bold text-heading">
              {currentUser?.organizationName ?? currentUser?.name ?? "Organization"}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {currentUser?.location || "Manage campaigns, supporters, and reporting from one place."}
            </p>
          </div>

          <nav className="space-y-2 p-4">
            {sidebarLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/organization" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link flex items-center justify-between ${
                    isActive ? "sidebar-link-active sidebar-link-active-org" : ""
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive ? <span className="text-xs font-semibold">Open</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="m-4 rounded-2xl border border-org/15 bg-[color-mix(in_oklab,var(--color-org)_8%,white)] p-4">
            <p className="text-sm font-semibold text-heading">Today&apos;s focus</p>
            <p className="mt-2 text-sm text-text-muted">
              Keep campaign progress, supporter communication, and transparency updates in one visible flow.
            </p>
          </div>
        </aside>

        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
