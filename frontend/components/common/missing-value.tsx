interface MissingValueProps {
  text?: string;
  className?: string;
}

export default function MissingValue({
  text = "Not available",
  className = "",
}: MissingValueProps) {
  return <span className={`text-text-muted ${className}`.trim()}>{text}</span>;
}
