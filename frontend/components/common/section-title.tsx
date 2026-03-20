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
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-gray-600">{description}</p>
      ) : null}
    </div>
  );
}