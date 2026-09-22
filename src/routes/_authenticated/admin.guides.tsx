import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/admin/guides")({
  head: () => adminHead("Rehberler", "Travely Guides içerik yönetimi."),
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
];

function emptyGuide(): AdminGuide {
  return {
    id: "",
    slug: "",
    categoryId: null,
    contentType: "GUIDE",
    published: false,
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
  const list = useQuery({ queryKey: ["admin-guides"], queryFn: () => listAdminGuides() });

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
      <AdminPanel title="Travely Guides">
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
                    {guide.published ? "Yayında" : "Taslak"}
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
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function GuideDrawer({
  guide,
  categories,
  onClose,
}: {
  guide: AdminGuide;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
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
      published: form.published,
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
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm({ ...form, published: event.target.checked })}
            />
            Yayında
          </label>
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
        <Field label={`Kısa ad (${locale.toUpperCase()} URL)`}>
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
        <Field label="Hero alt metni">
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
