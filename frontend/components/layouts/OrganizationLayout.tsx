"use client";

import React from "react";
import Link from "next/link";

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
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-main sidebar-container p-4">
        <nav className="space-y-2">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="sidebar-link"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
