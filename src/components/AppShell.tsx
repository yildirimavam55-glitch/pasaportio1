import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useI18n } from "@/i18n";
import { LOCALES, type Locale } from "@/domain/enums";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            {t("brand")}
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Link to="/esim">{t("nav.esim")}</Link>
            <Link to="/lounge">{t("nav.lounge")}</Link>
            <Link to="/hesabim">{t("nav.account")}</Link>
          </nav>
          <div className="flex items-center gap-1">
            {LOCALES.map((code: Locale) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={
                  "rounded-md px-2 py-1 text-xs uppercase " +
                  (code === locale
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent")
                }
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground">
        {t("common.phase")}
      </footer>
    </div>
  );
}

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
