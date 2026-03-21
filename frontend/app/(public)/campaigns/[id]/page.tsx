import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/common/container";
import CampaignDetailHero from "@/components/campaign/campaign-detail-hero";
import SectionTitle from "@/components/common/section-title";
import {
  getCampaignActivitySummary,
  getCampaignBySlug,
} from "@/lib/api/campaigns";
import { ApiError } from "@/lib/api/http";
import { listTransparencyLogs } from "@/lib/api/transparency";
import { formatDateTime } from "@/utils/format";

interface CampaignDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { id } = await params;

  try {
    const campaign = await getCampaignBySlug(id);
    const [summary, transparencyLogs] = await Promise.all([
      getCampaignActivitySummary(campaign.id),
      listTransparencyLogs({
        campaignId: campaign.id,
        limit: 20,
      }).catch(() => []),
    ]);

    return (
      <div className="py-10">
        <Container>
          <CampaignDetailHero
            campaign={campaign}
            beneficiaryCount={summary.beneficiaryCount}
            supporterCount={summary.supporterCount}
          />

          <section className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div>
              <SectionTitle
                title="Campaign Snapshot"
                description="Live activity metrics pulled from the backend."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Donations", value: String(summary.donationCount) },
                  {
                    label: "Volunteer Registrations",
                    value: String(summary.volunteerRegistrationCount),
                  },
                  {
                    label: "Support Types",
                    value: campaign.supportTypes?.join(", ") || "Not specified",
                  },
                  {
                    label: "Coverage Area",
                    value: campaign.location || "Not specified",
                  },
                ].map((item) => (
                  <div key={item.label} className="card-base border-border p-5">
                    <p className="text-sm text-text-muted">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-heading">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <SectionTitle
                  title="Transparency Timeline"
                  description="Public scan logs, donations, and activity milestones for this campaign."
                />
                {transparencyLogs.length > 0 ? (
                  <div className="space-y-3">
                    {transparencyLogs.slice(0, 12).map((log) => (
                      <article key={log.id} className="card-base border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-semibold text-heading">{log.title}</h3>
                          <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                            {log.type}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-text-muted">{log.description}</p>
                        <p className="mt-2 text-xs text-text-muted/70">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="card-base border-border p-4 text-sm text-text-muted">
                    No transparency logs for this campaign yet.
                  </div>
                )}
              </div>
            </div>

            <div className="card-base border-border p-6 h-fit sticky top-24">
              <h3 className="text-lg font-semibold text-heading">
                Support this campaign
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Choose the best matching support flow and continue with the
                authenticated experience.
              </p>

              <div className="mt-5 space-y-3">
                <Link
                  href={`/donate?campaignId=${campaign.id}`}
                  className="w-full btn-base btn-primary text-center"
                >
                  Donate money
                </Link>
                <Link
                  href={`/supporter/register?campaignId=${campaign.id}`}
                  className="w-full btn-base btn-secondary text-center"
                >
                  Register as supporter
                </Link>
              </div>
            </div>
          </section>
        </Container>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    return (
      <div className="py-10">
        <Container>
          <div className="card-base p-6 text-sm text-danger">
            Failed to load campaign details from the backend.
          </div>
        </Container>
      </div>
    );
  }
}
