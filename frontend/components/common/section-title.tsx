interface SectionTitleProps {
  title: string;
  description?: string;
}

export default function SectionTitle({
  title,
  description,
}: SectionTitleProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-heading">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-text-muted">{description}</p>
      ) : null}
    </div>
  );
}