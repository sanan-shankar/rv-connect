/** The "42 people" / "128 photos" line above every populated result set. */
export function ResultCount({
  count,
  singular,
  plural,
  className,
}: {
  count: number;
  singular: string;
  plural: string;
  className?: string;
}) {
  return (
    <p className={className ?? "text-sm text-muted-foreground"}>
      <span className="font-medium text-foreground">{count}</span>{" "}
      {count === 1 ? singular : plural}
    </p>
  );
}
