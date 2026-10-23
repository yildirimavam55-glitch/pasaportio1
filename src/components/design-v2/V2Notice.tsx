import type { V2Section } from "@/domain/storefront/v2";
import { V2SectionFrame } from "./V2SectionFrame";

export function V2Notice({ section, title, text }: { section: V2Section; title: string; text: string }) {
  const radius = section.design?.radius;
  const style = radius && radius !== "default" ? { borderRadius: { small: 8, medium: 16, large: 24 }[radius] } : undefined;
  return <V2SectionFrame section={section}><div data-v2-notice style={style} className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-border">
    <p data-v2-heading className="font-display text-base font-bold text-foreground">{title}</p>
    {text && <p data-v2-body className="mt-1 text-sm text-muted-foreground">{text}</p>}
  </div></V2SectionFrame>;
}
