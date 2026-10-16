import { useState } from 'react';
import { Globe2 } from 'lucide-react';

/** Failed selected media falls back to its destination, never a random photograph. */
export function CataloguePhoto({ src, fallback, alt, className }: { src?: string | undefined; fallback?: string | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const url = [src, fallback].find(value => value && !failed.includes(value));
  return url ? <img src={url} alt={alt} width={800} height={600} loading="lazy" decoding="async" className={className} onError={() => setFailed(current => [...current, url])} />
    : <span className={`catalogue-photo-fallback ${className ?? ''}`} role="img" aria-label={alt}><Globe2 aria-hidden="true" /></span>;
}