import React from "react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Public Layout Component
 * Used for all public-facing pages (guest pages)
 * - No sidebar
 * - Account-based navigation in navbar
 * - CTA for signup/login
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return <>{children}</>;
}
