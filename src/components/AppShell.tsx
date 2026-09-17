/** Admin-only presentation helper. The customer experience uses PublicShell. */
export function PlaceholderSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <section className="rounded-xl border border-border p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {items && (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
