import Container from "@/components/common/container";
import AvatarSkeleton from "@/components/loading/avatar-skeleton";
import CardSkeleton from "@/components/loading/card-skeleton";
import Skeleton from "@/components/loading/skeleton";
import TextSkeleton from "@/components/loading/text-skeleton";

function WorkspaceSidebarSkeleton() {
  return (
    <aside className="card-base h-fit overflow-hidden">
      <div className="border-b border-border bg-surface-light p-5">
        <Skeleton className="h-3 w-36 rounded-full" />
        <Skeleton className="mt-3 h-6 w-44 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-52 rounded-md" />
      </div>

      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={`workspace-link-${index}`} className="h-10 w-full rounded-md" />
        ))}
      </div>

      <div className="m-4 rounded-2xl border border-border bg-surface-light p-4">
        <TextSkeleton lines={2} lineClassName="h-3 w-full rounded" />
      </div>
    </aside>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={`stat-card-${index}`} className="card-base p-5">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="mt-3 h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function PublicHomeLoadingSkeleton() {
  return (
    <div className="bg-page py-8 md:py-10">
      <Container>
        <section className="hero-gradient overflow-hidden rounded-[2.5rem] border border-border px-5 py-8 md:px-8 md:py-10 lg:px-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-9 w-44 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>

            <div className="grid gap-3">
              <Skeleton className="h-14 w-44 rounded-xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-5/6 rounded-2xl" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-32 rounded-full" />
              <Skeleton className="h-11 w-52 rounded-full" />
            </div>

            <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`home-stat-${index}`} className="rounded-2xl border border-border bg-surface-main p-4">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="mt-2 h-8 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="mx-auto h-8 w-56 rounded-full" />
            <TextSkeleton className="mt-6" lines={2} lineClassName="mx-auto h-4 w-4/5 rounded" />
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <CardSkeleton key={`home-card-${index}`} lines={3} />
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}

export function PublicListLoadingSkeleton() {
  return (
    <div className="bg-page py-8 md:py-10">
      <Container>
        <section className="card-base p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <Skeleton className="h-9 w-56 rounded-lg" />
              <TextSkeleton className="mt-3" lines={2} lineClassName="h-4 w-full rounded" />
            </div>
            <Skeleton className="h-10 w-60 rounded-lg" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`list-stat-${index}`} className="rounded-2xl border border-border bg-surface-light p-4">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="mt-2 h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={`filter-${index}`} className="space-y-2">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </section>

        <section className="card-base mt-6 p-3">
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <CardSkeleton key={`campaign-card-${index}`} showImage lines={4} />
          ))}
        </section>
      </Container>
    </div>
  );
}

export function PublicDetailLoadingSkeleton() {
  return (
    <div className="bg-page py-10">
      <Container>
        <section className="card-base overflow-hidden">
          <Skeleton className="h-64 w-full border-b border-border md:h-80" />
          <div className="p-6 md:p-8">
            <div className="mb-3 flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <TextSkeleton className="mt-4" lines={3} lineClassName="h-4 w-full rounded" />
            <div className="mt-6 rounded-2xl border border-border bg-surface-light p-4">
              <Skeleton className="h-4 w-44 rounded" />
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <CardSkeleton className="p-6 md:p-7" lines={6} />
          <CardSkeleton className="h-fit p-6" lines={8} />
        </section>

        <section className="card-base mt-8 p-3">
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </section>
      </Container>
    </div>
  );
}

export function AuthFormLoadingSkeleton() {
  return (
    <div className="bg-page py-10 md:py-14">
      <Container className="max-w-2xl">
        <section className="card-base p-6 md:p-7">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <TextSkeleton className="mt-3" lines={2} lineClassName="h-4 w-full rounded" />

          <div className="mt-6 grid gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`auth-field-${index}`} className="space-y-2">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-11 w-full rounded-md" />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Skeleton className="h-11 w-36 rounded-md" />
            <Skeleton className="h-11 w-28 rounded-md" />
          </div>
        </section>
      </Container>
    </div>
  );
}

export function WorkspaceLoadingSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-page">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <WorkspaceSidebarSkeleton />

        <main className="min-w-0 space-y-6">
          <section className="card-base overflow-hidden">
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:p-8">
              <div>
                <Skeleton className="h-3 w-40 rounded-full" />
                <Skeleton className="mt-3 h-10 w-2/3 rounded-xl" />
                <TextSkeleton className="mt-3" lines={2} lineClassName="h-4 w-full rounded" />
                <div className="mt-6 flex flex-wrap gap-3">
                  <Skeleton className="h-11 w-36 rounded-md" />
                  <Skeleton className="h-11 w-36 rounded-md" />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface-main p-5">
                <Skeleton className="h-4 w-36 rounded" />
                <div className="mt-4 grid gap-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              </div>
            </div>
          </section>

          <StatsGridSkeleton />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <CardSkeleton lines={5} />
            <CardSkeleton lines={7} />
          </section>
        </main>
      </div>
    </div>
  );
}

export function WorkspaceFormLoadingSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-page">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <WorkspaceSidebarSkeleton />
        <main className="min-w-0">
          <section className="card-base p-6">
            <Skeleton className="h-8 w-56 rounded-lg" />
            <TextSkeleton className="mt-3" lines={2} lineClassName="h-4 w-full rounded" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={`form-field-${index}`} className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-11 w-full rounded-md" />
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Skeleton className="h-11 w-40 rounded-md" />
              <Skeleton className="h-11 w-24 rounded-md" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export function InlineFormCardSkeleton() {
  return (
    <div className="card-base p-6">
      <div className="mb-4 flex items-center gap-3">
        <AvatarSkeleton size="md" />
        <Skeleton className="h-4 w-44 rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={`inline-field-${index}`} className="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

