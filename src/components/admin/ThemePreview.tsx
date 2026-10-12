import type { CSSProperties } from "react";
import { ArrowRight, Globe2, Menu, Signal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/domain/experience/config";
import { themeCssVariables, type ThemeConfig } from "@/domain/theme/config";

export function ThemePreview({ theme, logoUrl, device }: { theme: ThemeConfig; logoUrl: string | null; device: "desktop" | "mobile" }) {
  const width = device === "mobile" ? 390 : 1024;
  const variables = themeCssVariables(theme) as CSSProperties;
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-secondary/40 p-2">
      <div className="v2-theme theme-surface mx-auto overflow-hidden border border-border bg-background text-foreground" data-theme-button={theme.buttonStyle} data-theme-surface={theme.surface} style={{ ...variables, width, maxWidth: "100%" }}>
        <header className="flex min-h-14 items-center gap-3 border-b border-border/60 bg-background/95 px-4">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-primary">
            {logoUrl ? <img src={logoUrl} alt="pasaport.io" className="h-9 w-auto max-w-36 shrink-0 object-contain" /> : <><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-brand"><Signal className="size-5" /></span><span className="font-display text-xl font-bold">{BRAND.name}</span></>}
          </span>
          {device === "desktop" ? <nav className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span>eSIM</span><span>Lounge</span><span>Vignette</span></nav> : <Menu className="size-5" />}
          <UserRound className="size-5" />
        </header>
        <main className={device === "desktop" ? "grid grid-cols-[1.15fr_.85fr] gap-6 p-8" : "p-4"}>
          <section className="min-w-0">
            <span className="text-xs font-bold uppercase text-primary">eSIM</span>
            <h2 className="mt-2 font-display text-3xl font-bold leading-tight">Dünyanın her yerinde bağlantıda kalın</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Başlık, gövde metni ve mağaza yüzeyinin taslak görünümü.</p>
            <div className="mt-5 flex flex-wrap gap-2"><Button variant="cta">Paketleri keşfet <ArrowRight /></Button><Button variant="outline">Cihazımı kontrol et</Button></div>
          </section>
          <section className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-0">
            {["Anında teslim", "Global kapsama"].map((label, index) => <article key={label} className="rounded-card border border-border bg-card p-4 shadow-card"><span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">{index ? <Globe2 className="size-4" /> : <Signal className="size-4" />}</span><h3 className="mt-3 font-display text-base font-bold">{label}</h3><p className="mt-1 text-xs text-muted-foreground">Gerçek V2 kart, renk, köşe ve gölge görünümü.</p></article>)}
          </section>
        </main>
      </div>
    </div>
  );
}