import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, Field } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { listAdminGuides, type AdminGuide } from "@/lib/guides.functions";
import {
  deleteSeoAuthor,
  getSeoSettings,
  listSeoAuthors,
  saveSeoAuthor,
  saveSeoSettings,
  DEFAULT_HUB_COPY,
  type SeoSettings,
} from "@/lib/seo-content.functions";
import { SEO_CHECK_LABELS, seoChecklist, type SeoCheckKey } from "@/domain/seo/checklist";
import { seoPath } from "@/domain/seo/paths";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/content/seo")({
  head: () => adminHead("SEO İçerik", "SEO içerik motoru: makaleler, şehirler, destinasyonlar ve SEO kontrolü."),
  component: SeoAdmin,
});

type Tab = "dashboard" | "articles" | "cities" | "destinations" | "categories" | "authors" | "settings";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "dashboard", label: "SEO Dashboard" },
  { id: "articles", label: "Makaleler" },
  { id: "cities", label: "Şehirler" },
  { id: "destinations", label: "Destinasyonlar" },
  { id: "categories", label: "Kategoriler" },
  { id: "authors", label: "Yazarlar" },
  { id: "settings", label: "SEO Ayarları" },
];

const LOCALES: Locale[] = ["tr", "de", "en"];

function SeoAdmin() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <AdminGate title="İçerik → SEO">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} onClick={() => setTab(t.id)}>
              {t.label}
            </Button>
          ))}
        </div>
        {tab === "authors" ? <AuthorsTab /> : tab === "settings" ? <SettingsTab /> : <GuidesTabs tab={tab} />}
      </div>
    </AdminGate>
  );
}

function checksFor(guide: AdminGuide) {
  return LOCALES.map((locale) => {
    const t = guide.translations.find((x) => x.locale === locale)!;
    return { locale, exists: Boolean(t.title && t.slug), t, checks: seoChecklist({ ...guide, translation: t }) };
  }).filter((row) => row.exists);
}

function GuidesTabs({ tab }: { tab: Tab }) {
  const list = useQuery({ queryKey: ["admin-guides"], queryFn: () => listAdminGuides() });
  const guides = list.data?.guides ?? [];

  const stats = useMemo(() => {
    const isArticle = (g: AdminGuide) => g.contentType !== "CITY" && g.contentType !== "DESTINATION";
    const published = guides.filter((g) => g.status === "PUBLISHED");
    const rows = guides.flatMap((g) => checksFor(g).map((c) => ({ g, ...c })));
    const referenced = new Set(guides.flatMap((g) => g.relatedGuideIds));
    const destinationCountries = new Set(
      published.filter((g) => g.contentType === "DESTINATION" && g.countryIso).map((g) => g.countryIso),
    );
    const orphans = published.filter(
      (g) =>
        g.contentType !== "DESTINATION" &&
        !referenced.has(g.id) &&
        !(g.countryIso && destinationCountries.has(g.countryIso)),
    );
    return {
      publishedArticles: published.filter(isArticle).length,
      draftArticles: guides.filter((g) => isArticle(g) && g.status !== "PUBLISHED" && g.status !== "ARCHIVED").length,
      publishedCities: published.filter((g) => g.contentType === "CITY").length,
      publishedDestinations: published.filter((g) => g.contentType === "DESTINATION").length,
      missingTitles: rows.filter((r) => !r.checks.seoTitle).length,
      missingDescriptions: rows.filter((r) => !r.checks.description).length,
      missingAlt: rows.filter((r) => !r.checks.imageAlt).length,
      missingLinks: rows.filter((r) => !r.checks.internalLinks).length,
      noindex: guides.filter((g) => !g.indexable).length,
      orphans,
    };
  }, [guides]);

  if (list.isPending) return <AdminLoading />;
  if (list.error) return <AdminError error={list.error} />;

  if (tab === "categories") {
    return (
      <AdminPanel title="Kategoriler">
        {(list.data?.categories ?? []).length ? (
          <ul className="grid gap-1 text-xs">
            {list.data!.categories.map((c) => (
              <li key={c.id} className="rounded-md border border-border px-3 py-2">
                <strong>{c.name}</strong> <span className="text-muted-foreground">/{c.slug}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Kategori yok." />
        )}
      </AdminPanel>
    );
  }

  if (tab === "dashboard") {
    const cards: Array<[string, number]> = [
      ["Yayındaki makaleler", stats.publishedArticles],
      ["Taslak / incelemedeki makaleler", stats.draftArticles],
      ["Yayındaki şehir sayfaları", stats.publishedCities],
      ["Yayındaki destinasyon sayfaları", stats.publishedDestinations],
      ["Eksik SEO başlığı", stats.missingTitles],
      ["Eksik açıklama", stats.missingDescriptions],
      ["Eksik ALT metni", stats.missingAlt],
      ["Eksik iç link", stats.missingLinks],
      ["Noindex sayfalar", stats.noindex],
      ["Orphan sayfalar", stats.orphans.length],
    ];
    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map(([label, value]) => (
            <div key={label} className="admin-card p-3">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
        <AdminPanel title="Orphan sayfalar (hiçbir içerikten link almayan)">
          {stats.orphans.length ? (
            <ul className="grid gap-1 text-xs">
              {stats.orphans.map((g) => (
                <li key={g.id}>
                  <Link to="/admin/guides" search={{ edit: g.id, type: undefined }} className="font-semibold text-primary">
                    {g.translations.find((t) => t.title)?.title || g.slug}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Orphan sayfa yok." />
          )}
        </AdminPanel>
        <ContentTable guides={guides} />
      </>
    );
  }

  const filter =
    tab === "cities"
      ? (g: AdminGuide) => g.contentType === "CITY"
      : tab === "destinations"
        ? (g: AdminGuide) => g.contentType === "DESTINATION"
        : (g: AdminGuide) => g.contentType !== "CITY" && g.contentType !== "DESTINATION";
  const newType = tab === "cities" ? "CITY" : tab === "destinations" ? "DESTINATION" : "ARTICLE";
  return (
    <>
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link to="/admin/guides" search={{ edit: undefined, type: newType }}>
            Yeni oluştur
          </Link>
        </Button>
      </div>
      <ContentTable guides={guides.filter(filter)} />
    </>
  );
}

function ContentTable({ guides }: { guides: AdminGuide[] }) {
  if (!guides.length) return <EmptyState title="Henüz içerik yok." />;
  const keys = Object.keys(SEO_CHECK_LABELS) as SeoCheckKey[];
  return (
    <AdminPanel title="İçerik ve SEO kontrol listesi">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="p-1.5">İçerik</th>
              <th className="p-1.5">Dil</th>
              <th className="p-1.5">Durum</th>
              {keys.map((k) => (
                <th key={k} className="p-1.5 whitespace-nowrap">
                  {SEO_CHECK_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guides.flatMap((g) =>
              checksFor(g).map((row) => (
                <tr key={`${g.id}-${row.locale}`} className="border-t border-border">
                  <td className="p-1.5">
                    <Link to="/admin/guides" search={{ edit: g.id, type: undefined }} className="font-semibold text-primary">
                      {row.t.title}
                    </Link>
                    <div className="text-muted-foreground">{seoPath(row.locale, g.contentType, row.t.slug)}</div>
                  </td>
                  <td className="p-1.5 uppercase">{row.locale}</td>
                  <td className="p-1.5">{g.status}</td>
                  {keys.map((k) => (
                    <td key={k} className={`p-1.5 text-center ${row.checks[k] ? "text-green-600" : "text-destructive"}`}>
                      {row.checks[k] ? "✓" : "✗"}
                    </td>
                  ))}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}

function AuthorsTab() {
  const queryClient = useQueryClient();
  const authors = useQuery({ queryKey: ["seo-authors"], queryFn: () => listSeoAuthors() });
  const [form, setForm] = useState({ id: null as string | null, name: "", bio: "", avatarUrl: "" });
  const save = useMutation({
    mutationFn: () => saveSeoAuthor({ data: form }),
    onSuccess: async () => {
      toast.success("Yazar kaydedildi.");
      setForm({ id: null, name: "", bio: "", avatarUrl: "" });
      await queryClient.invalidateQueries({ queryKey: ["seo-authors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSeoAuthor({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seo-authors"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminPanel title="Yazarlar">
        {authors.isPending ? (
          <AdminLoading />
        ) : authors.error ? (
          <AdminError error={authors.error} />
        ) : !authors.data?.length ? (
          <EmptyState title="Henüz yazar yok." />
        ) : (
          <ul className="grid gap-1.5 text-xs">
            {authors.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <strong>{a.name}</strong>
                <span className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setForm({ id: a.id, name: a.name, bio: a.bio, avatarUrl: a.avatarUrl })}>
                    Düzenle
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => window.confirm("Silinsin mi?") && remove.mutate(a.id)}>
                    Sil
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
      <AdminPanel title={form.id ? "Yazarı düzenle" : "Yeni yazar"}>
        <div className="grid gap-3">
          <Field label="Ad">
            <input className="admin-field mt-1 w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Biyografi">
            <textarea className="admin-field mt-1 h-20 w-full" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </Field>
          <Field label="Fotoğraf URL (https://)">
            <input className="admin-field mt-1 w-full" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} />
          </Field>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Kaydet
          </Button>
        </div>
      </AdminPanel>
    </div>
  );
}

function SettingsTab() {
  const settings = useQuery({ queryKey: ["seo-settings"], queryFn: () => getSeoSettings() });
  const [form, setForm] = useState<SeoSettings>({
    organizationName: "Travely",
    defaultOgImage: "",
    twitterHandle: "",
    hubs: DEFAULT_HUB_COPY,
  });
  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);
  const save = useMutation({
    mutationFn: () => saveSeoSettings({ data: form }),
    onSuccess: () => toast.success("SEO ayarları kaydedildi."),
    onError: (e: Error) => toast.error(e.message),
  });
  if (settings.isPending) return <AdminLoading />;
  if (settings.error) return <AdminError error={settings.error} />;
  return (
    <AdminPanel title="SEO Ayarları">
      <div className="grid max-w-xl gap-3">
        <Field label="Organizasyon adı (structured data)">
          <input className="admin-field mt-1 w-full" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
        </Field>
        <Field label="Varsayılan paylaşım görseli (https://, 1200×630)">
          <input className="admin-field mt-1 w-full" value={form.defaultOgImage} onChange={(e) => setForm({ ...form, defaultOgImage: e.target.value })} />
        </Field>
        <Field label="X / Twitter hesabı (@...)">
          <input className="admin-field mt-1 w-full" value={form.twitterHandle} onChange={(e) => setForm({ ...form, twitterHandle: e.target.value })} />
        </Field>
        {(["tr", "de", "en"] as const).map((loc) => (
          <fieldset key={loc} className="grid gap-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-bold uppercase">Rehber merkezi — {loc}</legend>
            {(["title", "description", "h1"] as const).map((key) => (
              <Field key={key} label={key === "title" ? "SEO başlığı" : key === "description" ? "Meta açıklama" : "H1"}>
                <input
                  className="admin-field mt-1 w-full"
                  value={form.hubs[loc][key]}
                  onChange={(e) =>
                    setForm({ ...form, hubs: { ...form.hubs, [loc]: { ...form.hubs[loc], [key]: e.target.value } } })
                  }
                />
              </Field>
            ))}
          </fieldset>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Kaydet
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Sitemap: /sitemap/xml — yalnız yayındaki ve indekslenebilir içerikler otomatik eklenir.
        </p>
      </div>
    </AdminPanel>
  );
}
