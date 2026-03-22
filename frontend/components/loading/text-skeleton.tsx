import Skeleton from "@/components/loading/skeleton";

interface TextSkeletonProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
  lastLineClassName?: string;
}

export default function TextSkeleton({
  lines = 3,
  className = "",
  lineClassName = "h-4 w-full rounded-md",
  lastLineClassName = "w-4/5",
}: TextSkeletonProps) {
  const totalLines = Math.max(1, lines);

  return (
    <div className={`grid gap-2 ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: totalLines }, (_, index) => {
        const isLastLine = index === totalLines - 1;
        const widthClass = isLastLine ? lastLineClassName : "";
        return (
          <Skeleton
            key={`${index}-${lineClassName}`}
            className={`${lineClassName} ${widthClass}`.trim()}
          />
        );
      })}
    </div>
  );
}

