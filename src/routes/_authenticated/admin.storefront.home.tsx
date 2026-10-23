import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  History,
  Lock,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
} from "lucide-react";
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
import { MediaField } from "@/components/admin/MediaPicker";
import { IconPicker } from "@/components/admin/IconPicker";
import { StorefrontPreview } from "@/components/admin/StorefrontPreview";
import { Button } from "@/components/ui/button";
import { listMedia } from "@/lib/admin-media.functions";
import {
  discardStorefrontDraft,
  getStorefrontEditor,
  restoreStorefrontVersion,
  saveStorefrontDraft,
} from "@/lib/storefront.functions";
import {
  ADDABLE_SECTION_TYPES,
  BACKGROUNDS,
  FIELD_LABELS,
  HERO_HEIGHTS,
  SECTION_META,
  SPACINGS,
  WIDTHS,
  createSection,
  isProtectedSection,
  missingLocales,
  type LocaleText,
  type SectionItem,
  type StorefrontConfig,
  type StorefrontSection,
  type StorefrontService,
} from "@/domain/storefront/registry";
import { BACKGROUND_LABEL } from "@/domain/storefront/styles";
import type { Locale } from "@/domain/enums";

export const Route = createFileRoute("/_authenticated/admin/storefront/home")({
  head: () => adminHead("Ana Sayfa", "Görsel mağaza düzenleyici."),
  component: StorefrontEditor,
});

const DEVICES = { desktop: 1040, tablet: 768, mobile: 390 } as const;
const DUPLICABLE = new Set([
  "POPULAR_DESTINATIONS",
  "PRODUCT_SOLUTIONS",
  "CROSS_SELL",
  "FAQ",
  "HOW_IT_WORKS",
  "DELIVERY",
  "TRUST",
]);
const emptyText = (): LocaleText => ({ tr: "", de: "", en: "" });

function StorefrontEditor() {
  const queryClient = useQueryClient();
  const [service, setService] = useState<StorefrontService>("global");
  const [locale, setLocale] = useState<Locale>("tr");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [draft, setDraft] = useState<StorefrontConfig | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [baseRevision,setBaseRevision]=useState<number|null>(null);
  const latest=useRef(draft),saving=useRef(draft);latest.current=draft;
  const [dragId, setDragId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const editor = useQuery({
    queryKey: ["storefront-editor", service],
    queryFn: () => getStorefrontEditor({ data: { service } }),
  });
  const media = useQuery({ queryKey: ["media-all"], queryFn: () => listMedia({ data: {} }) });

  useEffect(() => {
    if (!editor.data || dirty) return;
    setDraft(editor.data.draft);setBaseRevision(editor.data.revision??null);
    setSelectedId((current) => current ?? editor.data.draft.sections[0]?.id ?? null);
    setDirty(false);
  }, [editor.data,dirty]);

  /** Never silently lose work. */
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = useCallback((updater: (config: StorefrontConfig) => StorefrontConfig) => {
    setDraft((current) => (current ? updater(structuredClone(current)) : current));
    setDirty(true);
  }, []);

  const patchSection = useCallback(
    (id: string, patch: Partial<StorefrontSection>) => {
      update((config) => {
        const index = config.sections.findIndex((section) => section.id === id);
        if (index >= 0) config.sections[index] = { ...config.sections[index]!, ...patch };
        return config;
      });
    },
    [update],
  );

  const save = useMutation({
    mutationFn: (publish: boolean) => {saving.current=draft;return saveStorefrontDraft({ data: { service, config: draft!, publish,expectedRevision:baseRevision } });},
    onSuccess: async (_result, publish) => {
      if(latest.current!==saving.current){toast.info("Yeni yerel düzenlemeler korundu. Revizyonu kontrol edin.");await queryClient.invalidateQueries({queryKey:["storefront-editor",service]});return;}
      setDirty(false);
      toast.success(
        publish
          ? "Yayınlandı. Müşteri sayfası güncellendi."
          : "Taslak kaydedildi. Müşteri sayfası değişmedi.",
      );
      await queryClient.invalidateQueries({ queryKey: ["storefront-editor", service] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const discard = useMutation({
    mutationFn: () => discardStorefrontDraft({ data: { service,expectedRevision:baseRevision } }),
    onSuccess: async () => {
      setDirty(false);
      toast.success("Taslak değişiklikleri geri alındı.");
      await queryClient.invalidateQueries({ queryKey: ["storefront-editor", service] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const restore = useMutation({
    mutationFn: (versionId: string) => restoreStorefrontVersion({ data: { service, versionId,expectedRevision:baseRevision } }),
    onSuccess: async () => {
      setHistoryOpen(false);
      setDirty(false);
      toast.success("Önceki sürüm yalnızca taslağa geri yüklendi.");
      await queryClient.invalidateQueries({ queryKey: ["storefront-editor", service] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selected = draft?.sections.find((section) => section.id === selectedId) ?? null;
  const missing = useMemo(
    () =>
      draft
        ? { de: missingLocales(draft, "de"), en: missingLocales(draft, "en") }
        : { de: 0, en: 0 },
    [draft],
  );

  const move = (id: string, direction: -1 | 1) =>
    update((config) => {
      const index = config.sections.findIndex((section) => section.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= config.sections.length) return config;
      const [row] = config.sections.splice(index, 1);
      config.sections.splice(next, 0, row!);
      return config;
    });

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    update((config) => {
      const from = config.sections.findIndex((section) => section.id === dragId);
      const to = config.sections.findIndex((section) => section.id === targetId);
      if (from < 0 || to < 0) return config;
      const [row] = config.sections.splice(from, 1);
      config.sections.splice(to, 0, row!);
      return config;
    });
    setDragId(null);
  };

  const duplicate = (id: string) =>
    update((config) => {
      const index = config.sections.findIndex((section) => section.id === id);
      if (index < 0) return config;
      const copy = structuredClone(config.sections[index]!);
      copy.id = `${copy.id}-${Math.random().toString(36).slice(2, 6)}`;
      config.sections.splice(index + 1, 0, copy);
      return config;
    });

  /** Core commercial sections stay on the page; everything else may be removed. */
  const removeSection = (id: string) =>
    update((config) => {
      const section = config.sections.find((row) => row.id === id);
      if (!section || isProtectedSection(section.type)) return config;
      config.sections = config.sections.filter((row) => row.id !== id);
      if (selectedId === id) setSelectedId(null);
      return config;
    });

  const addSection = (type: StorefrontSection["type"]) => {
    const created = createSection(type);
    update((config) => {
      config.sections.push(created);
      return config;
    });
    setSelectedId(created.id);
  };

  return (
    <AdminGate title="Mağaza · Ana Sayfa">
      {editor.isPending || !draft ? (
        <AdminLoading />
      ) : editor.error ? (
        <AdminError error={editor.error} />
      ) : (
        <div className="grid gap-3">
          <AdminPanel title="Düzenleyici">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {(["global", "esim", "lounge"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={service === value ? "secondary" : "outline"}
                    onClick={() => {
                      if (dirty && !confirm("Kaydedilmemiş değişiklikler var. Devam edilsin mi?"))
                        return;
                      setService(value);
                      setSelectedId(null);
                    }}
                  >
                    {value === "global"
                      ? "Ortak Hero"
                      : value === "esim"
                        ? "eSIM içeriği"
                        : "Lounge içeriği"}
                  </Button>
                ))}
              </div>
              <span className="mx-1 h-6 w-px bg-border" />
              <div className="flex gap-1">
                {(["tr", "de", "en"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={locale === value ? "secondary" : "outline"}
                    onClick={() => setLocale(value)}
                  >
                    {value.toUpperCase()}
                    {value !== "tr" && missing[value] > 0 ? ` · ${missing[value]} eksik` : ""}
                  </Button>
                ))}
              </div>
              <span className="mx-1 h-6 w-px bg-border" />
              <div className="flex gap-1">
                <Button
                  size="icon"
                  className="size-9"
                  variant={device === "desktop" ? "secondary" : "outline"}
                  aria-label="Masaüstü önizleme"
                  onClick={() => setDevice("desktop")}
                >
                  <Monitor />
                </Button>
                <Button
                  size="icon"
                  className="size-9"
                  variant={device === "tablet" ? "secondary" : "outline"}
                  aria-label="Tablet önizleme"
                  onClick={() => setDevice("tablet")}
                >
                  <Tablet />
                </Button>
                <Button
                  size="icon"
                  className="size-9"
                  variant={device === "mobile" ? "secondary" : "outline"}
                  aria-label="Mobil önizleme"
                  onClick={() => setDevice("mobile")}
                >
                  <Smartphone />
                </Button>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {dirty && (
                  <span className="rounded-full bg-warning/20 px-2 py-1 text-[10px] font-bold">
                    Kaydedilmemiş değişiklik
                  </span>
                )}
                {editor.data?.hasDraftChanges && !dirty && (
                  <span className="rounded-full bg-info/10 px-2 py-1 text-[10px] font-bold text-info">
                    Yayınlanmamış taslak
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
                  <History />
                  Sürümler
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={discard.isPending}
                  onClick={() => {
                    if (confirm("Taslak değişiklikleri geri alınsın mı?")) discard.mutate();
                  }}
                >
                  <RotateCcw />
                  Değişiklikleri sil
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={save.isPending}
                  onClick={() => save.mutate(false)}
                >
                  <Save />
                  Taslağı kaydet
                </Button>
                <Button
                  size="sm"
                  variant="cta"
                  disabled={save.isPending}
                  onClick={() => {
                    if (confirm("Bu içerik müşteri sayfasında yayınlansın mı?")) save.mutate(true);
                  }}
                >
                  <Upload />
                  Yayınla
                </Button>
              </div>
            </div>
            {missing.de + missing.en > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {missing.de > 0 && (
                  <span className="mr-3 font-semibold text-warning-foreground">
                    DE çevirisi eksik ({missing.de} alan)
                  </span>
                )}
                {missing.en > 0 && (
                  <span className="font-semibold text-warning-foreground">
                    EN çevirisi eksik ({missing.en} alan)
                  </span>
                )}{" "}
                Eksik alanlarda müşteri sayfası Türkçe içeriği gösterir.
              </p>
            )}
          </AdminPanel>

          <div className="grid gap-3 xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
            <AdminPanel title="Sayfa bölümleri">
              <div className="grid gap-1.5">
                {draft.sections.map((section, index) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => setDragId(section.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropOn(section.id)}
                    className={`flex items-center gap-1.5 rounded-md border p-2 text-xs ${selectedId === section.id ? "border-primary bg-primary-soft/40" : "border-border bg-background"}`}
                  >
                    <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedId(section.id)}
                    >
                      <strong
                        className={`block truncate ${section.visible ? "" : "text-muted-foreground line-through"}`}
                      >
                        {SECTION_META[section.type].label}
                      </strong>
                    </button>
                    <button
                      type="button"
                      className="size-7 shrink-0 rounded hover:bg-secondary"
                      aria-label="Yukarı taşı"
                      onClick={() => move(section.id, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="mx-auto size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="size-7 shrink-0 rounded hover:bg-secondary"
                      aria-label="Aşağı taşı"
                      onClick={() => move(section.id, 1)}
                      disabled={index === draft.sections.length - 1}
                    >
                      <ArrowDown className="mx-auto size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="size-7 shrink-0 rounded hover:bg-secondary"
                      aria-label={section.visible ? "Gizle" : "Göster"}
                      onClick={() => patchSection(section.id, { visible: !section.visible })}
                    >
                      {section.visible ? (
                        <Eye className="mx-auto size-3.5" />
                      ) : (
                        <EyeOff className="mx-auto size-3.5 text-muted-foreground" />
                      )}
                    </button>
                    {DUPLICABLE.has(section.type) && !isProtectedSection(section.type) && (
                      <button
                        type="button"
                        className="size-7 shrink-0 rounded hover:bg-secondary"
                        aria-label="Kopyala"
                        onClick={() => duplicate(section.id)}
                      >
                        <Copy className="mx-auto size-3.5" />
                      </button>
                    )}
                    {isProtectedSection(section.type) ? (
                      <span
                        className="size-7 shrink-0 rounded"
                        title="Bu bölüm korumalıdır ve silinemez."
                      >
                        <Lock className="mx-auto size-3.5 text-muted-foreground" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="size-7 shrink-0 rounded text-destructive hover:bg-destructive/10"
                        aria-label="Bölümü sil"
                        onClick={() => {
                          if (confirm("Bu bölüm sayfadan kaldırılsın mı?"))
                            removeSection(section.id);
                        }}
                      >
                        <Trash2 className="mx-auto size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-1.5">
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                  value=""
                  aria-label="Eklenecek bölüm türü"
                  onChange={(event) => {
                    if (event.target.value)
                      addSection(event.target.value as StorefrontSection["type"]);
                  }}
                >
                  <option value="">+ Bölüm ekle…</option>
                  {ADDABLE_SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SECTION_META[type].label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Bölümleri sürükleyerek ya da oklarla sıralayabilirsin. Sıralama müşteri sayfasına
                birebir yansır. Kilit işaretli bölümler satışın çalışması için korunur.
              </p>
            </AdminPanel>

            <AdminPanel
              title={`Canlı önizleme · ${device === "desktop" ? "Masaüstü" : device === "tablet" ? "Tablet" : "Mobil 390px"}`}
            >
              <div className="overflow-x-auto bg-secondary/30 p-3">
                <StorefrontPreview
                  config={draft}
                  locale={locale}
                  media={media.data ?? []}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  width={DEVICES[device]}
                />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Önizleme taslak içeriği gösterir. Müşteri sayfası yalnızca yayınlandığında değişir.
              </p>
            </AdminPanel>

            <AdminPanel title={selected ? SECTION_META[selected.type].label : "Bölüm ayarları"}>
              {!selected ? (
                <EmptyState title="Soldan ya da önizlemeden bir bölüm seç." />
              ) : (
                <SectionSettings
                  section={selected}
                  locale={locale}
                  onPatch={(patch) => patchSection(selected.id, patch)}
                />
              )}
            </AdminPanel>
          </div>

          <AdminDrawer
            open={historyOpen}
            title="Sürüm geçmişi"
            subtitle="Önceki bir sürümü geri yükleyebilirsin"
            onClose={() => setHistoryOpen(false)}
          >
            {!editor.data?.versions.length ? (
              <EmptyState title="Henüz sürüm kaydı yok." />
            ) : (
              <div className="grid gap-2">
                {editor.data.versions.map((version: any) => (
                  <div
                    key={version.id}
                    className="flex items-center gap-3 rounded-md border border-border p-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <strong className="block">
                        {new Date(version.createdAt).toLocaleString("tr-TR")}
                      </strong>
                      <span className="text-muted-foreground">
                        {version.event === "publish"
                          ? "Yayın"
                          : version.event === "restore"
                            ? "Geri yükleme"
                            : "Taslak kaydı"}{" "}
                        · {version.author}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restore.isPending}
                      onClick={() => restore.mutate(version.id)}
                    >
                      Geri yükle
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AdminDrawer>
        </div>
      )}
    </AdminGate>
  );
}

function SectionSettings({
  section,
  locale,
  onPatch,
}: {
  section: StorefrontSection;
  locale: Locale;
  onPatch: (patch: Partial<StorefrontSection>) => void;
}) {
  const meta = SECTION_META[section.type];
  const setText = (key: string, value: string) =>
    onPatch({
      text: { ...section.text, [key]: { ...(section.text[key] ?? emptyText()), [locale]: value } },
    });
  const setItem = (id: string, patch: Partial<SectionItem>) =>
    onPatch({
      items: section.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  const setItemText = (id: string, key: "title" | "description" | "cta", value: string) =>
    setItem(id, {
      [key]: {
        ...(section.items.find((item) => item.id === id)?.[key] ?? emptyText()),
        [locale]: value,
      },
    } as Partial<SectionItem>);
  const moveItem = (index: number, direction: -1 | 1) => {
    const items = [...section.items];
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const [row] = items.splice(index, 1);
    items.splice(next, 0, row!);
    onPatch({ items });
  };
  const addItem = () =>
    onPatch({
      items: [
        ...section.items,
        {
          id: `item-${Math.random().toString(36).slice(2, 7)}`,
          icon: "Sparkles",
          mediaId: null,
          mobileMediaId: null,
          entity: "",
          href: "",
          showPrice: true,
          visible: true,
          title: emptyText(),
          description: emptyText(),
          cta: emptyText(),
        },
      ],
    });

  return (
    <div className="grid gap-3">
      <p className="text-[11px] text-muted-foreground">{meta.hint}</p>

      <div className="grid gap-2">
        {meta.fields.map((key) => {
          const value = section.text[key]?.[locale] ?? "";
          const missing = locale !== "tr" && !!section.text[key]?.tr && !value;
          const long = key === "description";
          return (
            <Field
              key={key}
              label={`${FIELD_LABELS[key] ?? key} (${locale.toUpperCase()})`}
              hint={
                missing
                  ? "Bu dilde çeviri eksik — müşteri sayfasında Türkçe gösterilir."
                  : undefined
              }
            >
              {long ? (
                <textarea
                  className="admin-field mt-1 w-full"
                  rows={3}
                  value={value}
                  onChange={(event) => setText(key, event.target.value)}
                />
              ) : (
                <input
                  className="admin-field mt-1 w-full"
                  value={value}
                  onChange={(event) => setText(key, event.target.value)}
                />
              )}
            </Field>
          );
        })}
      </div>

      {(section.type === "HERO" ||
        section.type === "CROSS_SELL" ||
        section.type === "DELIVERY" ||
        section.type === "COMPATIBILITY") && (
        <div className="grid gap-2">
          <MediaField
            label="Masaüstü görseli"
            value={section.mediaId}
            onChange={(id) => onPatch({ mediaId: id })}
          />
          <MediaField
            label="Mobil görsel"
            hint="Boş bırakılırsa masaüstü görseli kullanılır."
            value={section.mobileMediaId}
            onChange={(id) => onPatch({ mobileMediaId: id })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Görsel odak yatay · ${section.focalX}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={section.focalX}
                onChange={(event) => onPatch({ focalX: Number(event.target.value) })}
                className="mt-2 w-full"
              />
            </Field>
            <Field label={`Görsel odak dikey · ${section.focalY}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={section.focalY}
                onChange={(event) => onPatch({ focalY: Number(event.target.value) })}
                className="mt-2 w-full"
              />
            </Field>
          </div>
        </div>
      )}

      {section.type === "HERO" && (
        <div className="grid gap-2">
          <Field label={`Karartma gücü · ${section.overlay}`}>
            <input
              type="range"
              min={0}
              max={90}
              value={section.overlay}
              onChange={(event) => onPatch({ overlay: Number(event.target.value) })}
              className="mt-2 w-full"
            />
          </Field>
          <Field label="Metin hizası">
            <select
              className="admin-field mt-1 w-full"
              value={section.align}
              onChange={(event) =>
                onPatch({ align: event.target.value as StorefrontSection["align"] })
              }
            >
              <option value="left">Sola hizalı</option>
              <option value="center">Ortalanmış</option>
            </select>
          </Field>
          <Field label="Yükseklik">
            <select
              className="admin-field mt-1 w-full"
              value={section.height}
              onChange={(event) =>
                onPatch({ height: event.target.value as StorefrontSection["height"] })
              }
            >
              {HERO_HEIGHTS.map((value) => (
                <option key={value} value={value}>
                  {value === "compact" ? "Kısa" : value === "normal" ? "Normal" : "Yüksek"}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={section.showOffer}
              onChange={(event) => onPatch({ showOffer: event.target.checked })}
            />
            Teklif kartını göster
          </label>
          <Field
            label="Buton hedefi"
            hint="Yalnızca site içi adresler (örn. /esim/paketler veya #finder)."
          >
            <input
              className="admin-field mt-1 w-full"
              value={section.primaryHref}
              onChange={(event) => onPatch({ primaryHref: event.target.value })}
            />
          </Field>
        </div>
      )}

      {meta.items && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold">{meta.items} listesi</h3>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus />
              Ekle
            </Button>
          </div>
          {!section.items.length ? (
            <EmptyState title="Henüz öğe yok." />
          ) : (
            section.items.map((item, index) => (
              <div key={item.id} className="grid gap-2 rounded-md border border-border p-2.5">
                <div className="flex items-center gap-1">
                  <strong className="flex-1 truncate text-xs">
                    {item.title[locale] || item.title.tr || `${meta.items} ${index + 1}`}
                  </strong>
                  <button
                    type="button"
                    className="size-7 rounded hover:bg-secondary"
                    aria-label="Yukarı"
                    onClick={() => moveItem(index, -1)}
                  >
                    <ArrowUp className="mx-auto size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="size-7 rounded hover:bg-secondary"
                    aria-label="Aşağı"
                    onClick={() => moveItem(index, 1)}
                  >
                    <ArrowDown className="mx-auto size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="size-7 rounded hover:bg-secondary"
                    aria-label={item.visible ? "Gizle" : "Göster"}
                    onClick={() => setItem(item.id, { visible: !item.visible })}
                  >
                    {item.visible ? (
                      <Eye className="mx-auto size-3.5" />
                    ) : (
                      <EyeOff className="mx-auto size-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="size-7 rounded text-destructive hover:bg-destructive/10"
                    aria-label="Sil"
                    onClick={() =>
                      onPatch({ items: section.items.filter((row) => row.id !== item.id) })
                    }
                  >
                    <Trash2 className="mx-auto size-3.5" />
                  </button>
                </div>
                <Field label={`Başlık (${locale.toUpperCase()})`}>
                  <input
                    className="admin-field mt-1 w-full"
                    value={item.title[locale]}
                    onChange={(event) => setItemText(item.id, "title", event.target.value)}
                  />
                </Field>
                <Field label={`Açıklama (${locale.toUpperCase()})`}>
                  <textarea
                    className="admin-field mt-1 w-full"
                    rows={2}
                    value={item.description[locale]}
                    onChange={(event) => setItemText(item.id, "description", event.target.value)}
                  />
                </Field>
                {section.type === "POPULAR_DESTINATIONS" && (
                  <>
                    <Field label={`Buton metni (${locale.toUpperCase()})`}>
                      <input
                        className="admin-field mt-1 w-full"
                        value={item.cta[locale]}
                        onChange={(event) => setItemText(item.id, "cta", event.target.value)}
                      />
                    </Field>
                    <Field
                      label="Destinasyon / havalimanı kodu"
                      hint="Ülke kodu, virgülle çoklu rota (TR veya DE,AT,TR) ya da havalimanı kodu."
                    >
                      <input
                        className="admin-field mt-1 w-full"
                        value={item.entity}
                        onChange={(event) =>
                          setItem(item.id, { entity: event.target.value.toUpperCase() })
                        }
                      />
                    </Field>
                    <MediaField
                      label="Kart görseli"
                      category="DESTINATION"
                      value={item.mediaId}
                      onChange={(id) => setItem(item.id, { mediaId: id })}
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={item.showPrice}
                        onChange={(event) => setItem(item.id, { showPrice: event.target.checked })}
                      />
                      “Başlangıç fiyatı”nı göster (yayındaki katalogdan hesaplanır)
                    </label>
                  </>
                )}
                {section.type !== "POPULAR_DESTINATIONS" && section.type !== "FAQ" && (
                  <IconPicker
                    value={item.icon}
                    onChange={(name) => setItem(item.id, { icon: name })}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="grid gap-2 border-t border-border pt-3">
        <h3 className="text-xs font-bold">Görsel ayarlar</h3>
        <Field label="Arka plan">
          <select
            className="admin-field mt-1 w-full"
            value={section.background}
            onChange={(event) =>
              onPatch({ background: event.target.value as StorefrontSection["background"] })
            }
          >
            {BACKGROUNDS.map((value) => (
              <option key={value} value={value}>
                {BACKGROUND_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Boşluk">
          <select
            className="admin-field mt-1 w-full"
            value={section.spacing}
            onChange={(event) =>
              onPatch({ spacing: event.target.value as StorefrontSection["spacing"] })
            }
          >
            {SPACINGS.map((value) => (
              <option key={value} value={value}>
                {value === "compact" ? "Sıkışık" : value === "normal" ? "Normal" : "Geniş"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Genişlik">
          <select
            className="admin-field mt-1 w-full"
            value={section.width}
            onChange={(event) =>
              onPatch({ width: event.target.value as StorefrontSection["width"] })
            }
          >
            {WIDTHS.map((value) => (
              <option key={value} value={value}>
                {value === "standard" ? "Standart" : "Geniş"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Düzen çeşidi">
          <select
            className="admin-field mt-1 w-full"
            value={section.variant}
            onChange={(event) => onPatch({ variant: event.target.value })}
          >
            {meta.variants.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={section.visible}
            onChange={(event) => onPatch({ visible: event.target.checked })}
          />
          Bu bölüm müşteri sayfasında görünsün
        </label>
      </div>
    </div>
  );
}
