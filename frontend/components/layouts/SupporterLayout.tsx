"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

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
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const sidebarLinks = [
    { label: "Dashboard", href: "/supporter" },
    { label: "Register Support", href: "/supporter/register" },
    { label: "Scan QR", href: "/supporter/scan" },
    { label: "My Contributions", href: "/supporter/contributions" },
    { label: "My Registrations", href: "/supporter/registrations" },
    { label: "My Tasks", href: "/supporter/tasks" },
    { label: "Profile", href: "/supporter/profile" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(234,88,12,0.10),_transparent_28%),linear-gradient(180deg,_rgba(255,250,245,0.85),_rgba(255,255,255,0.96))]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card-base h-fit overflow-hidden border border-supporter/20 bg-white/90 shadow-[0_20px_50px_rgba(234,88,12,0.08)] backdrop-blur lg:sticky lg:top-20">
          <div className="border-b border-border bg-[linear-gradient(135deg,_rgba(234,88,12,0.14),_rgba(255,255,255,0.96))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-supporter">
              Supporter Workspace
            </p>
            <h2 className="mt-2 text-xl font-bold text-heading">{currentUser?.name ?? "Your account"}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {currentUser?.location || "Ready to help communities in need."}
            </p>
          </div>

          <nav className="space-y-2 p-4">
            {sidebarLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/supporter" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link flex items-center justify-between ${
                    isActive ? "sidebar-link-active sidebar-link-active-supporter" : ""
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive ? <span className="text-xs font-semibold">Now</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="m-4 rounded-2xl border border-supporter/15 bg-[color-mix(in_oklab,var(--color-supporter)_8%,white)] p-4">
            <p className="text-sm font-semibold text-heading">Quick reminder</p>
            <p className="mt-2 text-sm text-text-muted">
              Keep your support preferences and availability updated so organizers can match you faster.
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
