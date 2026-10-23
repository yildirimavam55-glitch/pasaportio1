import { V2PageTranslation } from "@/components/design-v2/V2PageTranslation";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createV2Section, defaultV2Page, sanitizeV2Page, v2Text, type V2PageConfig, type V2Section, type V2SectionDesign } from "@/domain/storefront/v2";
import { HERO_COPY } from "@/domain/storefront/hero-copy";
import { resolveHeroCopy } from "@/domain/storefront/hero-presentation";
import { LOCALE_REGISTRY, UI_LOCALES, type UiLocale } from "@/i18n/locales";
import { setActiveUiLocale } from "@/i18n/overlay";
import { V2HeroView } from "@/components/design-v2/V2HeroView";
import { V2SectionFrame } from "@/components/design-v2/V2SectionFrame";
import { V2Notice } from "@/components/design-v2/V2Notice";
import { V2TurkishTextEditor } from "@/components/design-v2/V2TurkishTextEditor";
import { demoLT, DEMO_TRANSLATIONS } from "./translation-fixtures";
import { ltStatus } from "@/domain/storefront/v2";
import { V2TypographyControls } from "@/components/design-v2/V2TypographyControls";
import { ImageDisplayControls } from "@/components/admin/ImageDisplayControls";
import coast from "@/assets/pasaport-final-coast.jpg";
import terrace from "@/assets/pasaport-mediterranean-terrace.jpg";
import "../styles.css";
import "./preview.css";

const CHANNEL = "pasaport-builder-acceptance-v1";
const IMAGE_IDS = ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002"] as const;
const IMAGES: Record<string, string> = { [IMAGE_IDS[0]]: coast, [IMAGE_IDS[1]]: terrace };
const DESIGN: V2SectionDesign = { width: "default", spacing: "default", background: "default", radius: "default", font: "theme", weight: "default", lineHeight: "default", letterSpacing: "default", textAlign: "default", position: "top-left" };
function initial(): V2PageConfig {
  const page = defaultV2Page("esim");
  const notice = createV2Section("NOTICE");
  notice.id = "builder-notice";
  notice.text = { title: demoLT("Bilgi"), text: demoLT("Seyahate çıkmadan önce cihazını kontrol et.") };
  const hero = structuredClone(page.sections.find(s => s.type === "SEARCH_HERO")!);
  hero.text = { eyebrow: demoLT("eSIM"), title: demoLT("Yolculuğuna bağlı kal"), subtitle: demoLT("Seyahat planına uygun eSIM paketini keşfet."), placeholder: demoLT("Nereye seyahat ediyorsun?"), sticky: demoLT("Ülke ara") };
  hero.heroTextMode = { tr: "custom" };
  // Synthetic acceptance section only. The saved/default homepage is never edited.
  page.sections = [hero, notice];
  return page;
}

type PreviewState = { config: V2PageConfig; locale: UiLocale };
function Canvas() {
  const [state, setState] = useState<PreviewState>({ config: initial(), locale: "tr" });
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== CHANNEL || !UI_LOCALES.includes(event.data.locale)) return;
      setState({ config: sanitizeV2Page(event.data.config, "esim"), locale: event.data.locale });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  const meta = LOCALE_REGISTRY[state.locale];
  setActiveUiLocale(state.locale);
  useEffect(() => { document.documentElement.lang = meta.bcp47; document.documentElement.dir = meta.dir; }, [meta]);
  const hero = state.config.sections.find(s => s.type === "SEARCH_HERO")!;
  const notice = state.config.sections.find(s => s.type === "NOTICE");
  const defaults = defaultV2Page("esim").sections.find(s => s.type === "SEARCH_HERO")!;
  const c = HERO_COPY[state.locale as keyof typeof HERO_COPY] ?? HERO_COPY[meta.content];
  const text = (key: string) => hero.text[key]?.[state.locale]?.trim() || hero.text[key]?.tr || "";
  const copy = resolveHeroCopy(hero, text("title"), text("subtitle"), v2Text(defaults, "subtitle", meta.content), c, state.locale);
  const missing = state.locale !== "tr" && state.config.sections.flatMap(s=>Object.values(s.text)).some(value => ltStatus(value, state.locale) === "MISSING" || ltStatus(value, state.locale) === "OUTDATED");
  return <main className="builder-canvas v2-theme" data-locale={state.locale}>
    {missing && <p className="rounded border border-border p-2 text-xs" data-preview-translation-warning>DEMO: Übersetzung fehlt oder ist veraltet. TR Fallback bzw. letzter Stand wird angezeigt, keine KI-Übersetzung.</p>}
    <V2SectionFrame section={hero}><V2HeroView section={hero} image={IMAGES[hero.mediaId ?? ""] ?? ""} tabletImage={IMAGES[hero.tabletMediaId ?? ""]} mobileImage={IMAGES[hero.mobileMediaId ?? ""]}
      heading={copy.useDefaultTitle ? <>{c.titleA} <span className="final-hero-accent">{c.titleB}</span></> : copy.title} subtitle={copy.subtitle}>
      <button type="button" className="pasaport-country-field w-full rounded-full text-start" disabled>{text("placeholder")}</button>
    </V2HeroView></V2SectionFrame>
    {notice && <V2Notice section={notice} title={notice.text["title"]?.[state.locale]?.trim() || notice.text["title"]?.tr || ""} text={notice.text["text"]?.[state.locale]?.trim() || notice.text["text"]?.tr || ""} />}
  </main>;
}

function BuilderDemo() {
  const [config, setConfig] = useState(initial);
  const [selected, setSelected] = useState("hero");
  const [locale, setLocale] = useState<UiLocale>("tr");
  const [width, setWidth] = useState(390);
  const frame = useRef<HTMLIFrameElement>(null);
  const section = config.sections.find(s => s.id === selected)!;
  const patch = (patch: Partial<V2Section>) => setConfig(value => sanitizeV2Page({ ...value, sections: value.sections.map(s => s.id === selected ? { ...s, ...patch } : s) }, "esim"));
  const send = () => frame.current?.contentWindow?.postMessage({ type: CHANNEL, config, locale }, window.location.origin);
  useEffect(send, [config, locale]);
  const design = section.design ?? DESIGN;
  return <div className="builder-demo" dir="ltr">
    <header><strong>Pasaport.io · V2-Baukasten</strong><p>Abnahme-Demo · nur Browser-Speicher · kein Speichern, Veröffentlichen, Upload oder Datenbankzugriff. DEMO-Übersetzungen sind vorgegebene Beispiele, keine KI. Echte automatische Übersetzung nur im gesicherten Admin nach Konfiguration und Freigabe. Die Suche ist hier absichtlich deaktiviert; im Shop bleibt sie unverändert.</p></header>
    <div className="builder-workspace"><aside>
      <label>Abschnitt<select aria-label="Abschnitt" value={selected} onChange={e => setSelected(e.target.value)}>{config.sections.map(s => <option key={s.id} value={s.id}>{s.type}</option>)}</select></label>
      <label>Vorschau in:<select aria-label="Vorschau in" value={locale} onChange={e => setLocale(e.target.value as UiLocale)}>{UI_LOCALES.map(code => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></label>
      <V2TurkishTextEditor key={selected} section={section} onChange={patch} previewLocale={locale} demo />
      <V2PageTranslation page={config} onChange={setConfig} demo transport={async input => ({translations:Object.fromEntries(Object.entries(input.entries).filter(([,source])=>DEMO_TRANSLATIONS[source]).map(([id,source])=>[id,Object.fromEntries(input.targets[id]!.map(code=>[code,DEMO_TRANSLATIONS[source]![code]]))])),failures:Object.fromEntries(Object.entries(input.entries).filter(([,source])=>!DEMO_TRANSLATIONS[source]).map(([id])=>[id,"E_NO_FIXTURE"]))})} />
      <V2TypographyControls design={design} onChange={design => patch({ design })} />
      <label>Abstände<select aria-label="Abstände" value={design.spacing} onChange={e => patch({ design: { ...design, spacing: e.target.value as V2SectionDesign["spacing"] } })}>{["default", "compact", "normal", "large"].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Hintergrund<input aria-label="Hintergrund" type="color" value={design.customColor ?? "#003d3d"} onChange={e => patch({ design: { ...design, background: "custom", customColor: e.target.value } })} /></label>
      {section.type === "SEARCH_HERO" && (["desktop", "tablet", "mobile"] as const).map(device => {
        const mediaKey = device === "desktop" ? "mediaId" : device === "tablet" ? "tabletMediaId" : "mobileMediaId";
        const cropKey = device === "desktop" ? "imageDisplay" : device === "tablet" ? "tabletImageDisplay" : "mobileImageDisplay";
        return <fieldset key={device}><legend>{device} · Bild</legend><select aria-label={`${device}-Bild`} value={section[mediaKey] && IMAGES[section[mediaKey]!] ? section[mediaKey]! : ""} onChange={e => patch({ [mediaKey]: e.target.value || null })}><option value="">Standard / Fallback</option><option value={IMAGE_IDS[0]}>Küste (vorhandenes Foto)</option><option value={IMAGE_IDS[1]}>Terrasse (vorhandenes Foto)</option></select>
          <ImageDisplayControls value={section[cropKey]} onChange={value => patch({ [cropKey]: value, ...(device === "desktop" ? { heroDesktopCrop: "custom" as const } : {}) })} />
        </fieldset>;
      })}
      <button type="button" onClick={() => setConfig(initial())}>Vorher / vollständig zurücksetzen</button>
      <p>Dieselben Schrift-/Farbkontrollen und Renderer werden im echten V2-Admin verwendet. Dort: /admin/storefront/v2/esim → SEARCH_HERO oder NOTICE → Entwurf/Vorschau. Bestehende Anmeldung und Freigabe bleiben erforderlich.</p>
    </aside><section className="builder-preview-panel"><div className="builder-toolbar">{[390, 768, 1440].map(w => <button key={w} type="button" aria-pressed={width === w} onClick={() => setWidth(w)}>{w} px</button>)}<a href="?canvas=1" target="_blank" rel="noreferrer">Standard separat öffnen</a></div>
      <div className="builder-frame-scroll"><iframe title="V2 Entwurfsvorschau" ref={frame} src="?canvas=1" onLoad={send} style={{ width, height: 850 }} /></div>
    </section></div>
  </div>;
}

createRoot(document.getElementById("root")!).render(new URLSearchParams(window.location.search).has("canvas") ? <Canvas /> : <BuilderDemo />);
