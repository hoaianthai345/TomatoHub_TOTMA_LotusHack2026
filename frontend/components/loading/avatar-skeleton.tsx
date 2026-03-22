import Skeleton from "@/components/loading/skeleton";

interface AvatarSkeletonProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const AVATAR_SIZE_CLASS: Record<NonNullable<AvatarSkeletonProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

export default function AvatarSkeleton({
  className = "",
  size = "md",
}: AvatarSkeletonProps) {
  return (
    <Skeleton
      className={`${AVATAR_SIZE_CLASS[size]} rounded-full ${className}`.trim()}
    />
  );
}

