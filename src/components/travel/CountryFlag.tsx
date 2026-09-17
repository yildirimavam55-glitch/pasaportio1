export function CountryFlag({ iso, label, className = "" }: { iso: string; label?: string; className?: string }) {
  const code = iso.toLowerCase();
  return <span className={`fi fi-${code} shrink-0 rounded-sm shadow-sm ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}