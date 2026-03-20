import Link from "next/link";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import CampaignCard from "@/components/campaign/campaign-card";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import type { Campaign } from "@/types/campaign";

export default async function HomePage() {
  let featuredCampaigns: Campaign[] = [];

  try {
    featuredCampaigns = await listPublishedCampaigns(2);
  } catch {
    featuredCampaigns = [];
  }

  return (
    <div className="py-10">
      <Container>
        <section className="rounded-3xl bg-primary px-6 py-12 text-white shadow-pop md:px-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">
            TomatoHub MVP
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">
            Volunteer & Aid Coordination Platform built for clear flow and
            transparency
          </h1>
          <p className="mt-4 max-w-2xl opacity-90">
            Organizations create campaigns. Supporters contribute through money,
            goods, volunteering, shipping, or coordination. Beneficiary support
            is tracked inside the system.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/campaigns"
              className="btn-base bg-white text-primary hover:bg-surface-muted shadow-soft"
            >
              Explore campaigns
            </Link>
            <Link
              href="/organization"
              className="btn-base border border-white/40 text-white hover:bg-white/10"
            >
              Organization dashboard
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <SectionTitle
            title="Featured Campaigns"
            description="Featured campaigns are now loaded from the live backend instead of static mock data."
          />
          {featuredCampaigns.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {featuredCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="card-base p-6 text-sm text-text-muted">
              Backend is reachable but no featured campaigns are available yet.
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}
