import { createFileRoute } from "@tanstack/react-router";
import { GuideRelationsSection } from "@/components/admin/ContentRelations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import {
  AdminDrawer,
  AdminError,
  AdminLoading,
  AdminPanel,
  EmptyState,
  Field,
} from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import {
  deleteGuide,
  listAdminGuides,
  saveGuide,
  type AdminGuide,
  type AdminGuideTranslation,
  type SaveGuideInput,
} from "@/lib/guides.functions";
import type { Locale } from "@/domain/enums";
import { LOCALES } from "@/domain/enums";
import { CITY_FACT_KEYS, cityFactsOf, type CityFacts, type GuideStatus } from "@/lib/guides.functions";
import { listSeoAuthors } from "@/lib/seo-content.functions";
import { SEO_CHECK_LABELS, seoChecklist, type SeoCheckKey } from "@/domain/seo/checklist";
import { seoPath } from "@/domain/seo/paths";

const CITY_FACT_LABELS: Record<keyof CityFacts, string> = {
  shortAnswer: "Kısa cevap / özet",
  airports: "Havalimanları ve havalimanında bağlanma",
  touristAreas: "Turistik bölgeler",
  travelStyle: "Seyahat tarzı",
  typicalStay: "Tipik kalış süresi",
  usageExamples: "İnternet kullanım örnekleri",
  transport: "Ulaşım / navigasyon ihtiyacı",
  connectivity: "Yerel bağlantı notları",
  networks: "Yerel mobil ağlar",
  coverage: "4G / 5G durumu",
  dataEstimate: "Tahmini veri ihtiyacı / kaç GB",
};

const STATUSES: Array<{ value: GuideStatus; label: string }> = [
  { value: "DRAFT", label: "Taslak" },
  { value: "REVIEW", label: "İncelemede" },
  { value: "PUBLISHED", label: "Yayında" },
  { value: "ARCHIVED", label: "Arşiv" },
];

export const Route = createFileRoute("/_authenticated/admin/guides")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search["edit"] === "string" ? (search["edit"] as string) : undefined,
    type: typeof search["type"] === "string" ? (search["type"] as string) : undefined,
  }),
  head: () => adminHead("Rehberler", "pasaport.io Guides içerik yönetimi."),
  component: GuidesAdmin,
});

const CONTENT_TYPES: Array<{ value: AdminGuide["contentType"]; label: string }> = [
  { value: "GUIDE", label: "Rehber" },
  { value: "DESTINATION", label: "Destinasyon" },
  { value: "HOW_TO", label: "Nasıl yapılır" },
  { value: "COMPARISON", label: "Karşılaştırma" },
  { value: "ROAD_TRIP", label: "Road trip" },
  { value: "AIRPORT_GUIDE", label: "Havalimanı rehberi" },
  { value: "VIGNETTE_GUIDE", label: "Vignette rehberi" },
  { value: "CITY", label: "Şehir sayfası (SEO)" },
  { value: "ARTICLE", label: "Makale / blog (SEO)" },
];

function emptyGuide(): AdminGuide {
  return {
    id: "",
    slug: "",
    categoryId: null,
    contentType: "GUIDE",
    published: false,
    status: "DRAFT",
    countryIso: "",
    cityName: "",
    authorId: null,
    indexable: true,
    canonicalOverride: "",
    relatedGuideIds: [],
    featured: false,
    sortOrder: 0,
    heroImageUrl: "",
    heroAlt: "",
    readingMinutes: null,
    publishedAt: null,
    updatedAt: "",
    countryIsos: [],
    airportIatas: [],
    serviceTypes: [],
    translations: LOCALES.map((locale) => ({
      locale,
      slug: "",
      title: "",
      excerpt: "",
      intro: "",
      sections: [],
      faq: [],
      seoTitle: "",
      seoDescription: "",
      published: false,
      h1: "",
      heroAlt: "",
      cityFacts: cityFactsOf({}),
    })),
  };
}

function GuidesAdmin() {
  return (
    <AdminGate title="Rehberler">
      <GuidesAdminContent />
    </AdminGate>
  );
}

function GuidesAdminContent() {
  const [editing, setEditing] = useState<AdminGuide | null>(null);
  const search = Route.useSearch();
  const list = useQuery({ queryKey: ["admin-guides"], queryFn: () => listAdminGuides() });
  useEffect(() => {
    if (!list.data || editing) return;
    if (search.edit) {
      const found = list.data.guides.find((g) => g.id === search.edit);
      if (found) setEditing(found);
    } else if (search.type && CONTENT_TYPES.some((t) => t.value === search.type)) {
      setEditing({ ...emptyGuide(), contentType: search.type as AdminGuide["contentType"] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data, search.edit, search.type]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteGuide({ data: { id } }),
    onSuccess: async () => {
      toast.success("Rehber silindi.");
      await list.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <AdminPanel title="pasaport.io Guides">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            Yalnızca yayınladığın rehberler sitede görünür. Yayınlanmamış içerik arama motorlarına kapatılır.
          </p>
          <Button size="sm" onClick={() => setEditing(emptyGuide())}>
            Yeni rehber
          </Button>
        </div>
        <div className="mt-3">
          {list.isPending ? (
            <AdminLoading />
          ) : list.error ? (
            <AdminError error={list.error} />
          ) : !list.data?.guides.length ? (
            <EmptyState title="Henüz rehber yok." />
          ) : (
            <div className="grid gap-1.5">
              {list.data.guides.map((guide) => (
                <div
                  key={guide.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <span className="min-w-0">
                    <strong className="truncate">
                      {guide.translations.find((t) => t.title)?.title || guide.slug}
                    </strong>{" "}
                    <span className="text-muted-foreground">/{guide.slug}</span>
                  </span>
                  <span className={guide.published ? "text-green-600" : "text-muted-foreground"}>
                    {STATUSES.find((s) => s.value === guide.status)?.label ?? "Taslak"}
                  </span>
                  <span className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(guide)}>
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm("Bu rehber silinsin mi?")) remove.mutate(guide.id);
                      }}
                    >
                      Sil
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminPanel>
      {editing ? (
        <GuideDrawer
          key={editing.id || "new"}
          guide={editing}
          categories={(list.data?.categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
          allGuides={list.data?.guides ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function GuideDrawer({
  guide,
  categories,
  allGuides,
  onClose,
}: {
  guide: AdminGuide;
  categories: Array<{ id: string; name: string }>;
  allGuides: AdminGuide[];
  onClose: () => void;
}) {
  const authors = useQuery({ queryKey: ["seo-authors"], queryFn: () => listSeoAuthors() });
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminGuide>(guide);
  const [locale, setLocale] = useState<Locale>("tr");
  const translation = form.translations.find((t) => t.locale === locale)!;

  const save = useMutation({
    mutationFn: (input: SaveGuideInput) => saveGuide({ data: input }),
    onSuccess: async () => {
      toast.success("Kaydedildi.");
      await queryClient.invalidateQueries({ queryKey: ["admin-guides"] });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setTranslation = (patch: Partial<AdminGuideTranslation>) =>
    setForm((current) => ({
      ...current,
      translations: current.translations.map((t) => (t.locale === locale ? { ...t, ...patch } : t)),
    }));

  const submit = () => {
    if (!translation.title.trim() || !translation.slug.trim()) {
      toast.error("Bu dil için başlık ve kısa ad (slug) gerekiyor.");
      return;
    }
    save.mutate({
      id: guide.id || null,
      slug: form.slug,
      categoryId: form.categoryId,
      contentType: form.contentType,
      published: form.status === "PUBLISHED",
      status: form.status,
      publishedAt: form.publishedAt,
      countryIso: form.countryIso,
      cityName: form.cityName,
      authorId: form.authorId,
      indexable: form.indexable,
      canonicalOverride: form.canonicalOverride,
      relatedGuideIds: form.relatedGuideIds,
      featured: form.featured,
      sortOrder: form.sortOrder,
      heroImageUrl: form.heroImageUrl,
      heroAlt: form.heroAlt,
      readingMinutes: form.readingMinutes,
      countryIsos: form.countryIsos,
      airportIatas: form.airportIatas,
      serviceTypes: form.serviceTypes,
      translations: form.translations,
    });
  };

  return (
    <AdminDrawer open title="Rehber" onClose={onClose}>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                locale === code ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">
            Her dilin kendi başlığı, içeriği ve yayın durumu vardır.
          </span>
        </div>

        <Field label="Genel kısa ad (slug, dil noktası yok)">
          <input
            className="admin-field mt-1 w-full"
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
            placeholder="turkiye-de-internet"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kategori">
            <select
              className="admin-field mt-1 w-full"
              value={form.categoryId ?? ""}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value || null })}
            >
              <option value="">—</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="İçerik tipi">
            <select
              className="admin-field mt-1 w-full"
              value={form.contentType}
              onChange={(event) =>
                setForm({ ...form, contentType: event.target.value as AdminGuide["contentType"] })
              }
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Durum">
            <select
              className="admin-field mt-1 w-full"
              value={form.status}
              onChange={(event) => {
                const status = event.target.value as GuideStatus;
                setForm({ ...form, status, published: status === "PUBLISHED" });
              }}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm({ ...form, featured: event.target.checked })}
            />
            Ana sayfada öne çıkar
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={translation.published}
              onChange={(event) => setTranslation({ published: event.target.checked })}
            />
            Bu dil yayında
          </label>
        </div>

        <Field label={`Başlık (${locale.toUpperCase()})`}>
          <input
            className="admin-field mt-1 w-full"
            value={translation.title}
            onChange={(event) => setTranslation({ title: event.target.value })}
          />
        </Field>
        <Field label={`H1 (${locale.toUpperCase()}, boşsa başlık kullanılır)`}>
          <input
            className="admin-field mt-1 w-full"
            value={translation.h1}
            onChange={(event) => setTranslation({ h1: event.target.value })}
          />
        </Field>
        <Field label={`Kısa ad (${locale.toUpperCase()} URL)`} hint={translation.slug ? `URL: ${seoPath(locale, form.contentType, translation.slug)}` : undefined}>
          <input
            className="admin-field mt-1 w-full"
            value={translation.slug}
            onChange={(event) => setTranslation({ slug: event.target.value })}
            placeholder="turkiye-de-internet"
          />
        </Field>
        <Field label="Özet">
          <textarea
            className="admin-field mt-1 h-16 w-full"
            value={translation.excerpt}
            onChange={(event) => setTranslation({ excerpt: event.target.value })}
          />
        </Field>
        <Field label="Giriş">
          <textarea
            className="admin-field mt-1 h-24 w-full"
            value={translation.intro}
            onChange={(event) => setTranslation({ intro: event.target.value })}
          />
        </Field>

        <div className="grid gap-2">
          <span className="text-xs font-bold">Bölümler</span>
          {translation.sections.map((section, index) => (
            <div key={index} className="grid gap-1 rounded-md border border-border p-2">
              <input
                className="admin-field w-full"
                value={section.heading}
                placeholder="Başlık"
                onChange={(event) => {
                  const sections = [...translation.sections];
                  sections[index] = { ...section, heading: event.target.value };
                  setTranslation({ sections });
                }}
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={section.level === 3}
                  disabled={index === 0}
                  onChange={(event) => {
                    const sections = [...translation.sections];
                    const { level: _drop, ...rest } = section;
                    sections[index] = event.target.checked ? { ...rest, level: 3 } : rest;
                    setTranslation({ sections });
                  }}
                />
                Alt başlık (H3) — önceki H2 bölümünün alt konusu
              </label>
              <textarea
                className="admin-field h-20 w-full"
                value={section.body}
                placeholder="Metin"
                onChange={(event) => {
                  const sections = [...translation.sections];
                  sections[index] = { ...section, body: event.target.value };
                  setTranslation({ sections });
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setTranslation({ sections: translation.sections.filter((_, i) => i !== index) })
                }
              >
                Bölümü kaldır
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTranslation({ sections: [...translation.sections, { heading: "", body: "" }] })}
          >
            Bölüm ekle
          </Button>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-bold">Sık sorulan sorular</span>
          {translation.faq.map((item, index) => (
            <div key={index} className="grid gap-1 rounded-md border border-border p-2">
              <input
                className="admin-field w-full"
                value={item.question}
                placeholder="Soru"
                onChange={(event) => {
                  const faq = [...translation.faq];
                  faq[index] = { ...item, question: event.target.value };
                  setTranslation({ faq });
                }}
              />
              <textarea
                className="admin-field h-16 w-full"
                value={item.answer}
                placeholder="Cevap"
                onChange={(event) => {
                  const faq = [...translation.faq];
                  faq[index] = { ...item, answer: event.target.value };
                  setTranslation({ faq });
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTranslation({ faq: translation.faq.filter((_, i) => i !== index) })}
              >
                Soruyu kaldır
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTranslation({ faq: [...translation.faq, { question: "", answer: "" }] })}
          >
            Soru ekle
          </Button>
        </div>

        {form.contentType === "CITY" || form.contentType === "DESTINATION" ? (
          <div className="grid gap-2 rounded-md border border-border p-2">
            <span className="text-xs font-bold">
              Şehir / destinasyon bilgileri ({locale.toUpperCase()}) — yalnız dolu alanlar sayfada görünür
            </span>
            {CITY_FACT_KEYS.map((key) => (
              <Field key={key} label={CITY_FACT_LABELS[key]}>
                <textarea
                  className="admin-field mt-1 h-16 w-full"
                  value={translation.cityFacts[key]}
                  onChange={(event) =>
                    setTranslation({ cityFacts: { ...translation.cityFacts, [key]: event.target.value } })
                  }
                />
              </Field>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Ana ülke (ISO)">
            <input
              className="admin-field mt-1 w-full"
              value={form.countryIso}
              maxLength={2}
              onChange={(event) => setForm({ ...form, countryIso: event.target.value.toUpperCase() })}
              placeholder="TR"
            />
          </Field>
          <Field label="Şehir">
            <input
              className="admin-field mt-1 w-full"
              value={form.cityName}
              onChange={(event) => setForm({ ...form, cityName: event.target.value })}
              placeholder="Istanbul"
            />
          </Field>
          <Field label="Yazar">
            <select
              className="admin-field mt-1 w-full"
              value={form.authorId ?? ""}
              onChange={(event) => setForm({ ...form, authorId: event.target.value || null })}
            >
              <option value="">—</option>
              {(authors.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.indexable}
              onChange={(event) => setForm({ ...form, indexable: event.target.checked })}
            />
            Arama motorlarında indekslensin (index)
          </label>
          <Field label="Canonical URL (boşsa sayfanın kendi URL'si)">
            <input
              className="admin-field mt-1 w-full"
              value={form.canonicalOverride}
              onChange={(event) => setForm({ ...form, canonicalOverride: event.target.value })}
              placeholder="https://..."
            />
          </Field>
        </div>
        <Field label="İlgili içerikler (iç linkler)">
          <div className="mt-1 grid max-h-40 gap-1 overflow-y-auto rounded-md border border-border p-2">
            {allGuides
              .filter((g) => g.id && g.id !== form.id)
              .map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.relatedGuideIds.includes(g.id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        relatedGuideIds: event.target.checked
                          ? [...form.relatedGuideIds, g.id]
                          : form.relatedGuideIds.filter((id) => id !== g.id),
                      })
                    }
                  />
                  {g.translations.find((t) => t.title)?.title || g.slug}
                </label>
              ))}
          </div>
        </Field>

        <Field label="Ülke ISO kodları (virgülle, bağlam + alakalı hizmet)">
          <input
            className="admin-field mt-1 w-full"
            value={form.countryIsos.join(", ")}
            onChange={(event) =>
              setForm({
                ...form,
                countryIsos: event.target.value
                  .split(",")
                  .map((value) => value.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
            placeholder="TR, DE"
          />
        </Field>
        <Field label="Havalimanı kodları (virgülle, IATA)">
          <input
            className="admin-field mt-1 w-full"
            value={form.airportIatas.join(", ")}
            onChange={(event) =>
              setForm({
                ...form,
                airportIatas: event.target.value
                  .split(",")
                  .map((value) => value.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
            placeholder="FRA"
          />
        </Field>
        <Field label="Hizmetler (virgülle: ESIM, LOUNGE, CAR_RENTAL, TRANSFER)">
          <input
            className="admin-field mt-1 w-full"
            value={form.serviceTypes.join(", ")}
            onChange={(event) =>
              setForm({
                ...form,
                serviceTypes: event.target.value
                  .split(",")
                  .map((value) => value.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
            placeholder="ESIM"
          />
        </Field>
        <Field label="Hero görsel URL (https://)">
          <input
            className="admin-field mt-1 w-full"
            value={form.heroImageUrl}
            onChange={(event) => setForm({ ...form, heroImageUrl: event.target.value })}
          />
        </Field>
        <Field label={`Görsel ALT metni (${locale.toUpperCase()})`}>
          <input
            className="admin-field mt-1 w-full"
            value={translation.heroAlt}
            onChange={(event) => setTranslation({ heroAlt: event.target.value })}
          />
        </Field>
        <Field label="Hero alt metni (genel yedek)">
          <input
            className="admin-field mt-1 w-full"
            value={form.heroAlt}
            onChange={(event) => setForm({ ...form, heroAlt: event.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SEO başlığı">
            <input
              className="admin-field mt-1 w-full"
              value={translation.seoTitle}
              onChange={(event) => setTranslation({ seoTitle: event.target.value })}
            />
          </Field>
          <Field label="SEO açıklaması">
            <input
              className="admin-field mt-1 w-full"
              value={translation.seoDescription}
              onChange={(event) => setTranslation({ seoDescription: event.target.value })}
            />
          </Field>
        </div>

        <SeoChecklistView guide={form} locale={locale} />
        {form.id ? <div className="mt-4"><GuideRelationsSection guideId={form.id} /></div> : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Kaydet
          </Button>
        </div>
      </div>
    </AdminDrawer>
  );
}

function SeoChecklistView({ guide, locale }: { guide: AdminGuide; locale: Locale }) {
  const t = guide.translations.find((x) => x.locale === locale)!;
  const checks = seoChecklist({ ...guide, translation: t });
  return (
    <div className="rounded-md border border-border p-2">
      <span className="text-xs font-bold">SEO kontrol listesi ({locale.toUpperCase()})</span>
      <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] sm:grid-cols-3">
        {(Object.keys(SEO_CHECK_LABELS) as SeoCheckKey[]).map((key) => (
          <li key={key} className={checks[key] ? "text-green-600" : "text-destructive"}>
            {checks[key] ? "✓" : "✗"} {SEO_CHECK_LABELS[key]}
          </li>
        ))}
      </ul>
    </div>
  );
}
