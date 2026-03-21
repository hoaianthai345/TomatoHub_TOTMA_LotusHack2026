import Link from "next/link";
import Container from "@/components/common/container";
import { listOrganizations } from "@/lib/api/organizations";
import type { Organization } from "@/types/organization";
import { formatDateTime } from "@/utils/format";

function toWebsiteHref(value?: string): string | null {
  if (!value?.trim()) {
    return null;
  }

  const website = value.trim();
  if (website.startsWith("http://") || website.startsWith("https://")) {
    return website;
  }

  return `https://${website}`;
}

export default async function OrganizationListPage() {
  let organizations: Organization[] = [];
  let loadError = false;

  try {
    organizations = await listOrganizations({ limit: 200 });
  } catch {
    loadError = true;
  }

  return (
    <div className="bg-page py-8 md:py-10">
      <Container>
        <section className="card-base p-6 md:p-7">
          <h1 className="text-3xl font-bold text-heading">Organization Directory</h1>
          <p className="mt-2 max-w-3xl text-sm text-text-muted">
            Browse verified and active organizations, then open each profile to
            view upcoming and live campaigns.
          </p>
        </section>

        {loadError ? (
          <div className="mt-6 card-base border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
            Failed to load organizations from the backend.
          </div>
        ) : null}

        {organizations.length > 0 ? (
          <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => {
              const websiteHref = toWebsiteHref(organization.website);

              return (
                <article
                  key={organization.id}
                  className="card-base card-hover flex h-full flex-col p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {organization.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={organization.logoUrl}
                          alt={organization.name}
                          className="h-12 w-12 rounded-xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted text-xs font-semibold uppercase text-text-muted">
                          ORG
                        </div>
                      )}

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-heading">
                          {organization.name}
                        </h2>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                          {organization.verified ? "Verified organization" : "Organization"}
                        </p>
                      </div>
                    </div>

                    {organization.verified ? (
                      <span className="badge-base badge-success">Verified</span>
                    ) : null}
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm text-text-muted">
                    {organization.description || "No public description yet."}
                  </p>

                  <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface-light p-3 text-sm">
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Location</span>
                      <span className="text-right font-medium text-text">
                        {organization.location || "Not specified"}
                      </span>
                    </p>
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Credit score</span>
                      <span className="text-right font-medium text-text">
                        {organization.creditScore ?? "N/A"}
                      </span>
                    </p>
                    <p className="flex items-start justify-between gap-3">
                      <span className="text-text-muted">Joined</span>
                      <span className="text-right font-medium text-text">
                        {formatDateTime(organization.createdAt)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/organizations/${organization.id}`}
                      className="btn-base btn-primary text-sm"
                    >
                      View profile
                    </Link>
                    {websiteHref ? (
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-base btn-secondary text-sm"
                      >
                        Website
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="mt-6 card-base p-6 text-sm text-text-muted">
            No organizations available yet.
          </div>
        )}
      </Container>
    </div>
  );
}
