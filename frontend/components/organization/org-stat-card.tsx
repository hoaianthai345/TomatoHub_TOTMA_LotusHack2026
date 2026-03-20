interface OrgStatCardProps {
  label: string;
  value: string | number;
}

export default function OrgStatCard({ label, value }: OrgStatCardProps) {
  return (
    <div className="card-base p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-heading">{value}</p>
    </div>
  );
}