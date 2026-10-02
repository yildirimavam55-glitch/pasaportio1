import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

/**
 * Safe renderer for the owner-authored legal text format. Never uses innerHTML.
 * Blocks (separated by blank lines): "# ", "## ", "### " headings, "- " bullets, "1. " numbered,
 * "---" divider, anything else a paragraph. Inline: **bold**, *italic*, [text](https://…|/path|mailto:…).
 */
export function LegalRichText({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="grid gap-4 text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">
      {blocks.map((block, index) => <Block key={index} block={block} />)}
    </div>
  );
}

function Block({ block }: { block: string }) {
  if (/^-{3,}$/.test(block)) return <hr className="border-border" />;
  if (block.startsWith("### ")) return <h3 className="mt-2 font-display text-base font-bold text-foreground">{inline(block.slice(4))}</h3>;
  if (block.startsWith("## ")) return <h2 className="mt-3 font-display text-xl font-bold text-foreground">{inline(block.slice(3))}</h2>;
  if (block.startsWith("# ")) return <h2 className="mt-3 font-display text-2xl font-bold text-foreground">{inline(block.slice(2))}</h2>;
  const lines = block.split("\n");
  if (lines.every((l) => /^[-*] /.test(l))) return <ul className="list-disc space-y-1 ps-5">{lines.map((l, i) => <li key={i}>{inline(l.slice(2))}</li>)}</ul>;
  if (lines.every((l) => /^\d+[.)] /.test(l))) return <ol className="list-decimal space-y-1 ps-5">{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\d+[.)] /, ""))}</li>)}</ol>;
  return <p>{lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l)}</Fragment>)}</p>;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

function safeHref(raw: string): string | null {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(raw)) return raw;
  if (/^https:\/\/[^\s]+$/i.test(raw)) return raw;
  return null;
}

function inline(text: string): ReactNode[] {
  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2] ?? "");
      if (!href) return <Fragment key={i}>{link[1]}</Fragment>;
      if (href.startsWith("/")) return <Link key={i} to={href} className="font-medium text-primary underline underline-offset-2">{link[1]}</Link>;
      return <a key={i} href={href} {...(href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-medium text-primary underline underline-offset-2">{link[1]}</a>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
