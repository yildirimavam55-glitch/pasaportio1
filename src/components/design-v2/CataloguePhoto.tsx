import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";

function uniqueUrls(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    urls.push(value);
  }
  return urls;
}

/**
 * Shared storefront photograph. The renderer never owns the source: callers pass a
 * preferred URL plus fallbacks (CMS media, builtin slot, catalogue photo). A missing
 * or broken file shows a mint placeholder that keeps the card's box.
 */
export function CataloguePhoto({
  src,
  fallback,
  fallbacks,
  alt,
  className,
  priority = false,
  imageKey,
}: {
  src?: string | undefined;
  fallback?: string | undefined;
  fallbacks?: Array<string | undefined>;
  alt: string;
  className?: string;
  priority?: boolean;
  imageKey?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const candidates = uniqueUrls([src, fallback, ...(fallbacks ?? [])]);
  const fallbackKey = (fallbacks ?? []).join("\0");
  useEffect(() => {
    setFailed([]);
  }, [imageKey, src, fallback, fallbackKey]);
  const url = candidates.find((value) => !failed.includes(value));
  if (!url) {
    return (
      <span className={`catalogue-photo-fallback ${className ?? ""}`} role="img" aria-label={alt} data-storefront-image={imageKey} data-storefront-empty="true">
        <Globe2 aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={800}
      height={600}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      data-storefront-image={imageKey}
      onError={() => setFailed((current) => (current.includes(url) ? current : [...current, url]))}
    />
  );
}
