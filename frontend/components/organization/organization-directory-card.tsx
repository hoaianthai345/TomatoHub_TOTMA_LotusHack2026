import Link from "next/link";
import { CalendarClock, Globe2, HandHeart, MapPin } from "lucide-react";
import MissingValue from "@/components/common/missing-value";
import StatusBadge from "@/components/common/status-badge";
import type { Organization } from "@/types/organization";
import { formatDateTime } from "@/utils/format";

interface OrganizationDirectoryCardProps {
  organization: Organization;
}

const FOCUS_RULES: Array<{ label: string; keywords: string[] }> = [
  {
    label: "Education support",
    keywords: ["education", "school", "student", "learning", "teacher", "scholarship"],
  },
  {
    label: "Health and care",
    keywords: ["health", "medical", "hospital", "care", "clinic", "treatment"],
  },
  {
    label: "Food and essentials",
    keywords: ["food", "meal", "nutrition", "essential", "supply", "grocery"],
  },
  {
    label: "Disaster response",
    keywords: ["disaster", "flood", "storm", "earthquake", "emergency", "relief"],
  },
  {
    label: "Environment action",
    keywords: ["environment", "climate", "tree", "green", "nature", "recycle"],
  },
  {
    label: "Child and family",
    keywords: ["child", "children", "family", "youth", "orphan", "mother"],
  },
  {
    label: "Community uplift",
    keywords: ["community", "neighborhood", "local", "inclusion", "livelihood"],
  },
];

function extractFocusAreas(description?: string): string[] {
  if (!description?.trim()) {
    return ["Community support", "Open initiatives"];
  }

  const source = description.toLowerCase();
  const matches = FOCUS_RULES.filter((rule) =>
    rule.keywords.some((keyword) => source.includes(keyword))
  ).map((rule) => rule.label);

  if (matches.length > 0) {
    return matches.slice(0, 2);
  }

  return ["Community support", "Open initiatives"];
}

export default function OrganizationDirectoryCard({
  organization,
}: OrganizationDirectoryCardProps) {
  const focusAreas = extractFocusAreas(organization.description);
  const hasWebsite = Boolean(organization.website?.trim());

  return (
    <Link
      href={`/organizations/${organization.id}`}
      aria-label={`Open organization profile for ${organization.name}`}
      className="group block h-full rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
    >
      <article className="card-base flex h-full min-h-[420px] flex-col p-4 transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-[0_12px_28px_rgba(17,24,39,0.09)] md:p-5">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {organization.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover shadow-[0_8px_18px_rgba(17,24,39,0.08)]"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-light text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                ORG
              </div>
            )}

            <div className="min-w-0">
              <h2 className="min-h-[2.8rem] line-clamp-2 text-lg font-bold leading-tight text-heading">
                {organization.name}
              </h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="badge-base border border-border bg-surface-light text-xs text-text-muted">
                  Charity
                </span>
                {hasWebsite ? (
                  <span className="badge-base border border-border bg-white text-xs text-text-muted">
                    <Globe2 aria-hidden="true" className="icon-14" />
                    Website
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <StatusBadge
            kind="verified_state"
            value={organization.verified ? "verified" : "unverified"}
            size={14}
          />
        </header>

        <p className="mt-4 min-h-[4.2rem] line-clamp-3 text-sm leading-6 text-text-muted">
          {organization.description || "No public description yet."}
        </p>

        <div className="mt-3 flex min-h-[2.6rem] flex-wrap gap-2">
          {focusAreas.map((focus) => (
            <span
              key={`${organization.id}-${focus}`}
              className="badge-base border border-primary/20 bg-primary/10 text-xs text-primary"
            >
              <HandHeart aria-hidden="true" className="icon-14" />
              {focus}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl border border-border bg-white p-3 text-sm">
          <p className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <MapPin aria-hidden="true" className="icon-14" />
              Location
            </span>
            <span className="max-w-[62%] text-right font-medium text-text">
              {organization.location ? (
                <span className="line-clamp-1">{organization.location}</span>
              ) : (
                <MissingValue />
              )}
            </span>
          </p>
          <p className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-text-muted">
              <CalendarClock aria-hidden="true" className="icon-14" />
              Joined
            </span>
            <span className="max-w-[62%] text-right font-medium text-text">
              {organization.createdAt ? (
                formatDateTime(organization.createdAt)
              ) : (
                <MissingValue text="N/A" />
              )}
            </span>
          </p>
        </div>

        <div className="mt-auto pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Community profile
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Full campaign history and support channels are available inside profile.
          </p>
        </div>
      </article>
    </Link>
  );
}
