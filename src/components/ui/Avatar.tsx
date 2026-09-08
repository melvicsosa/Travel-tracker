export function Avatar({
  short,
  color,
  name,
  className = "",
}: {
  short: string;
  color: string;
  name?: string;
  className?: string;
}) {
  return (
    <span className={`av ${className}`} style={{ background: color }} title={name} aria-label={name}>
      {short}
    </span>
  );
}
