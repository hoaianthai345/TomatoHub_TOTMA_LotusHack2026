import AvatarSkeleton from "@/components/loading/avatar-skeleton";
import Skeleton from "@/components/loading/skeleton";
import TextSkeleton from "@/components/loading/text-skeleton";

interface CardSkeletonProps {
  className?: string;
  lines?: number;
  showImage?: boolean;
  withAvatar?: boolean;
  showFooter?: boolean;
}

export default function CardSkeleton({
  className = "",
  lines = 3,
  showImage = false,
  withAvatar = false,
  showFooter = false,
}: CardSkeletonProps) {
  return (
    <article className={`card-base overflow-hidden p-5 ${className}`.trim()}>
      {showImage ? <Skeleton className="mb-4 h-44 w-full rounded-xl" /> : null}

      {withAvatar ? (
        <div className="mb-3 flex items-center gap-3">
          <AvatarSkeleton size="md" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
      ) : null}

      <TextSkeleton
        lines={lines}
        lineClassName="h-4 w-full rounded-md"
        lastLineClassName="w-3/4"
      />

      {showFooter ? (
        <div className="mt-4 flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ) : null}
    </article>
  );
}

