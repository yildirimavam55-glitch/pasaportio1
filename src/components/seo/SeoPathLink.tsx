import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Typed link for a final localized SEO path (/tr/esim/x, /de/ratgeber/x, ...).
 * Keeps every internal SEO link on its final URL — never a legacy /guides URL.
 */
export function SeoPathLink({
  path,
  className,
  children,
}: {
  path: string;
  className?: string;
  children: ReactNode;
}) {
  const [, locale, folder, slug] = path.split("/");
  const common = { className, children };
  if (slug) {
    if (locale === "tr" && folder === "esim") return <Link to="/tr/esim/$slug" params={{ slug }} {...common} />;
    if (locale === "de" && folder === "esim") return <Link to="/de/esim/$slug" params={{ slug }} {...common} />;
    if (locale === "en" && folder === "esim") return <Link to="/en/esim/$slug" params={{ slug }} {...common} />;
    if (locale === "tr" && folder === "rehber") return <Link to="/tr/rehber/$slug" params={{ slug }} {...common} />;
    if (locale === "de" && folder === "ratgeber") return <Link to="/de/ratgeber/$slug" params={{ slug }} {...common} />;
    if (locale === "en" && folder === "guides") return <Link to="/en/guides/$slug" params={{ slug }} {...common} />;
  }
  if (locale === "de" && folder === "ratgeber") return <Link to="/de/ratgeber" {...common} />;
  if (locale === "en" && folder === "guides") return <Link to="/en/guides" {...common} />;
  if (locale === "tr" && folder === "rehber") return <Link to="/tr/rehber" {...common} />;
  if (locale === "de") return <Link to="/de" {...common} />;
  if (locale === "en") return <Link to="/en" {...common} />;
  return <Link to="/tr" {...common} />;
}
