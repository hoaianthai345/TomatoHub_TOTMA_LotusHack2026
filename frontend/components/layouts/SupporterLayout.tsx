"use client";

import React from "react";
import Link from "next/link";

interface SupporterLayoutProps {
  children: React.ReactNode;
}

/**
 * Supporter Layout Component
 * Used for all supporter dashboard pages
 * - Left sidebar with navigation
 * - Supporter-specific dashboard links
 * - Profile and settings
 */
export default function SupporterLayout({ children }: SupporterLayoutProps) {
  const sidebarLinks = [
    { label: "Dashboard", href: "/supporter" },
    { label: "Register Support", href: "/supporter/register" },
    { label: "My Contributions", href: "/supporter/contributions" },
    { label: "My Registrations", href: "/supporter/registrations" },
    { label: "My Tasks", href: "/supporter/tasks" },
    { label: "Profile", href: "/supporter/profile" },
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
