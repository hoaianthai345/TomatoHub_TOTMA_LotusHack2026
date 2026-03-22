import { Suspense } from "react";
import Container from "@/components/common/container";
import CampaignBrowser from "@/components/campaign/campaign-browser";
import { CardSkeleton, Skeleton, TextSkeleton } from "@/components/loading";
import { listPublishedCampaigns } from "@/lib/api/campaigns";
import type { Campaign } from "@/types/campaign";

function CampaignBrowserFallback() {
  return (
    <section className="card-base p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-9 w-52 rounded-lg" />
          <TextSkeleton className="mt-3" lines={2} lineClassName="h-4 w-80 max-w-full rounded" />
        </div>
        <Skeleton className="h-10 w-56 rounded-lg" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`campaign-metric-${index}`} className="rounded-2xl border border-border bg-surface-light p-4">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="mt-2 h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={`campaign-filter-${index}`} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      <div className="card-base mt-6 p-3">
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <CardSkeleton key={`campaign-card-fallback-${index}`} showImage lines={4} />
        ))}
      </div>
    </section>
  );
}

async function CampaignBrowserContent() {
  let campaigns: Campaign[] = [];

  try {
    campaigns = await listPublishedCampaigns();
  } catch {
    campaigns = [];
  }

  return <CampaignBrowser campaigns={campaigns} />;
}

export default function CampaignListPage() {
  return (
    <div className="py-8 md:py-10">
      <Container>
        <Suspense fallback={<CampaignBrowserFallback />}>
          <CampaignBrowserContent />
        </Suspense>
      </Container>
    </div>
  );
}
