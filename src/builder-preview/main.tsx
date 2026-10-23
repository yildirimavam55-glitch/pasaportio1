import { CountryFlag } from "@/components/travel/CountryFlag";
import { HERO_TITLE } from "@/domain/storefront/hero-title";
import { HeroHeading } from "@/components/design-v2/HeroHeading";
import { HeroTrustCards } from "@/components/design-v2/HeroTrustCards";
import { PublicHeaderFrame, HEADER_LOCALE_FLAG } from "@/components/travel/PublicHeaderFrame";
import { Signal, Search, MapPin, Menu, UserRound } from "lucide-react";
import { SectionLibrary } from '@/components/admin/SectionLibrary';
import { EditorialSectionEditor } from '@/components/admin/EditorialSectionEditor';
import { cloneEditorialSection,SECTION_LIMIT } from '@/domain/storefront/editorial';
import { CardDesignControls } from "@/components/admin/CardDesignControls";
import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell";
import { ADMIN_GROUPS } from "@/components/admin/admin-navigation";
import { ResponsivePreview } from "@/components/admin/ResponsivePreview";
import { CompletePageSection } from "./CompletePageSections";
import { V2_SECTION_LABELS, V2_PROTECTED } from "@/domain/storefront/v2";
import { EditorialItemControls } from "@/components/admin/EditorialItemControls";
import { UnifiedThemeControls } from "@/components/admin/UnifiedThemeControls";
import { ChromeControls,ConfiguredNavigation } from "@/components/admin/ChromeControls";
import { DEFAULT_THEME,sanitizeTheme,themeCssVariables,themeResponsiveCss,type ThemeConfig } from "@/domain/theme/config";
import { defaultStorefront,sanitizeStorefront,type StorefrontConfig } from "@/domain/storefront/registry";
import { chromeTranslationPage,applyChromeTranslation } from "@/domain/storefront/chrome-translation";
import { newEditorSession,saveEditorSession,restoreEditorSession,type EditorSession } from "@/domain/storefront/editor-session";
import { AccountEditorial } from "@/components/account/AccountEditorial";
import { V2EditorialGrid } from "@/components/design-v2/V2EditorialGrid";
import { V2EditorialFaq } from "@/components/design-v2/V2EditorialFaq";
import { StorefrontIcon,ICON_NAMES } from "@/domain/storefront/icons";
import { ResponsiveMediaControls } from "@/components/admin/ResponsiveMediaControls";
import type { CSSProperties } from "react";
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
import { demoLT, DEMO_TRANSLATIONS, sanitizeDemoPage } from "./translation-fixtures";
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
  page.sections = new URLSearchParams(window.location.search).has("fixture") ? [hero, notice] : [...structuredClone(page.sections), notice];
  if (new URLSearchParams(window.location.search).has("reference")) {
    const savedHero=page.sections.find(s=>s.type==='SEARCH_HERO')!;
    savedHero.text['title']={tr:HERO_TITLE.tr.titleA,de:HERO_TITLE.de.titleA,en:HERO_TITLE.en.titleA,...Object.fromEntries(UI_LOCALES.map(locale=>[locale,HERO_TITLE[locale].titleA]))};
    savedHero.text['accent']={tr:HERO_TITLE.tr.titleB,de:HERO_TITLE.de.titleB,en:HERO_TITLE.en.titleB,...Object.fromEntries(UI_LOCALES.map(locale=>[locale,HERO_TITLE[locale].titleB]))};
    savedHero.heroTextMode=Object.fromEntries(UI_LOCALES.map(locale=>[locale,'custom' as const]));
  }
  return page;
}

type PreviewState = { config: V2PageConfig; locale: UiLocale; theme:ThemeConfig;chrome:StorefrontConfig;account:boolean };
function Canvas() {
  const [state, setState] = useState<PreviewState>({ config: initial(), locale: "tr",theme:DEFAULT_THEME,chrome:defaultStorefront("global"),account:false });
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== CHANNEL || !UI_LOCALES.includes(event.data.locale)) return;
      setState({ config: sanitizeDemoPage(event.data.config), locale: event.data.locale,theme:sanitizeTheme(event.data.theme),chrome:sanitizeStorefront(event.data.chrome,"global"),account:event.data.account===true });
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  const reference=new URLSearchParams(window.location.search).has("reference");
  const meta = LOCALE_REGISTRY[state.locale];
  setActiveUiLocale(state.locale);
  useEffect(() => { document.documentElement.lang = meta.bcp47; document.documentElement.dir = meta.dir; }, [meta]);
  const hero = state.config.sections.find(s => s.type === "SEARCH_HERO")!;
  const defaults = defaultV2Page("esim").sections.find(s => s.type === "SEARCH_HERO")!;
  const c = HERO_COPY[state.locale as keyof typeof HERO_COPY] ?? HERO_COPY[meta.content];
  const text = (key: string) => hero.text[key]?.[state.locale]?.trim() || hero.text[key]?.tr || "";
  const copy = resolveHeroCopy(hero, text("title"), text("subtitle"), v2Text(defaults, "subtitle", meta.content), c, state.locale);
  const missing = state.locale !== "tr" && state.config.sections.flatMap(s=>Object.values(s.text)).some(value => value.tr.trim() && (ltStatus(value, state.locale) === "MISSING" || ltStatus(value, state.locale) === "OUTDATED"));
  const heroView = <V2SectionFrame section={hero}><V2HeroView section={hero} image={IMAGES[hero.mediaId ?? ""] ?? ""} tabletImage={IMAGES[hero.tabletMediaId ?? ""]} mobileImage={IMAGES[hero.mobileMediaId ?? ""]}
      heading={<HeroHeading section={hero} locale={state.locale} title={text("title")} subtitle={text("subtitle")} defaultSubtitle={v2Text(defaults,"subtitle",meta.content)}/>} subtitle={copy.subtitle} trust={reference?<div className="hero-trust-strip registered-trust-strip"><HeroTrustCards section={state.config.sections.find(s=>s.type==='BENEFIT_ROW')} locale={state.locale} resolve={id=>IMAGES[id??'']}/></div>:undefined}>
      <button type="button" className="pasaport-country-field flex items-center gap-3 w-full rounded-full text-start" disabled><MapPin className="size-5 shrink-0"/><span className="min-w-0 flex-1">{text("placeholder")}</span><span className="pasaport-country-arrow grid place-items-center"><Search className="size-5"/></span></button>
    </V2HeroView></V2SectionFrame>;
  return <main className="builder-canvas v2-theme" data-locale={state.locale} data-theme-button={state.theme.buttonStyle} style={state.theme.applyToDark?themeCssVariables(state.theme) as CSSProperties:undefined}>
    <style>{state.theme.applyToDark?themeResponsiveCss(state.theme):""}</style>
    {reference ? <PublicHeaderFrame reference brand={<a href="/tr" className="flex shrink-0 items-center gap-2 text-primary"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Signal className="size-5"/></span><span className="font-display text-xl font-bold">pasaport.io</span></a>} navigation={<nav className="hidden lg:flex gap-4"><ConfiguredNavigation rows={state.chrome.navigation.filter(r=>!r.href.includes('lounge')&&!r.href.includes('vignette'))} locale={state.locale} render={(row,label,icon)=><a href={row.href} className="nav-link inline-flex items-center gap-2">{icon}{label}</a>}/></nav>}><span className="public-header-language p-2"><CountryFlag iso={HEADER_LOCALE_FLAG[state.locale]}/><span>{state.locale.toUpperCase()}</span><span data-testid="header-currency-code"><span className="public-header-currency-separator">/ </span>EUR</span></span><a href="/auth" aria-label="Account" className="size-11 grid place-items-center"><UserRound className="size-5"/></a><button type="button" aria-label="Menu" className="size-11 grid place-items-center" disabled><Menu className="size-5"/></button></PublicHeaderFrame> : <nav data-configured-header className="flex gap-3 flex-wrap py-3"><ConfiguredNavigation rows={state.chrome.navigation.filter(r=>!r.href.includes('lounge')&&!r.href.includes('vignette'))} locale={state.locale} render={(row,label,icon)=><a href={row.href} onClick={e=>e.preventDefault()} className="inline-flex gap-1">{icon}{label}</a>}/></nav>}
    {state.account&&<section data-account-layout-preview><strong>Account · Pflichtmodule: eSIM / Bestellungen / Profil / Sicherheit / Support</strong><AccountEditorial config={state.chrome} locale={state.locale}/><p>Präsentationsvorschau ohne Konten, Bestellungen, QR oder Zugangsdaten.</p></section>}

    {missing && <p className="rounded border border-border p-2 text-xs" data-preview-translation-warning>DEMO: Übersetzung fehlt oder ist veraltet. TR Fallback bzw. letzter Stand wird angezeigt, keine KI-Übersetzung.</p>}
    {state.config.sections.filter(s=>s.visible).map(s=>reference&&s.type==='BENEFIT_ROW'?<div key={s.id} data-complete-section={s.id}/>:<CompletePageSection key={s.id} section={s} locale={state.locale} resolve={id=>IMAGES[id??'']} hero={heroView} onSelect={id=>window.parent.postMessage({type:CHANNEL+'-select',id},window.location.origin)}/>)}
    <footer data-configured-footer className="border-t mt-4 py-4"><p>{state.chrome.footerText[state.locale]||state.chrome.footerText.tr}</p><div className="flex flex-wrap gap-3"><ConfiguredNavigation rows={state.chrome.footerLinks.filter(r=>!r.href.includes('lounge')&&!r.href.includes('vignette'))} locale={state.locale} render={(row,label,icon)=><a href={row.href} onClick={e=>e.preventDefault()}>{label}</a>}/></div></footer>
  </main>;
}

const demoTransport:(input:import('@/domain/storefront/page-translation').TranslationRequest)=>Promise<import('@/domain/storefront/page-translation').TranslationResponse>=async input=>({translations:Object.fromEntries(Object.entries(input.entries).filter(([,source])=>DEMO_TRANSLATIONS[source]).map(([id,source])=>[id,Object.fromEntries(input.targets[id]!.map(code=>[code,DEMO_TRANSLATIONS[source]![code]]))])),failures:Object.fromEntries(Object.entries(input.entries).filter(([,source])=>!DEMO_TRANSLATIONS[source]).map(([id])=>[id,'E_NO_FIXTURE']))});
function BuilderDemo() {
  const [config, setConfig] = useState(initial);
  const [theme,setTheme]=useState<ThemeConfig>(DEFAULT_THEME);
  const [chrome,setChrome]=useState<StorefrontConfig>(()=>defaultStorefront('global'));
  const [tab,setTab]=useState('Seiten');
  const [mobileOpen,setMobileOpen]=useState(false);
  const [session,setSession]=useState<EditorSession>(()=>newEditorSession({page:initial(),theme:DEFAULT_THEME,chrome:defaultStorefront('global')}));
  const [sessionMessage,setSessionMessage]=useState('Nur synthetischer Browser-Speicher. Kein bestehendes System.');
  const [view,setView]=useState('draft');
  const install=(value:EditorSession['draft'])=>{setConfig(value.page);setTheme(value.theme);setChrome(value.chrome);};
  const saveSession=(publish=false)=>{const next=saveEditorSession(session,{page:config,theme,chrome},session.revision,publish);setSession(next);localStorage.setItem('pasaport-admin-synthetic-v1',JSON.stringify(next));setSessionMessage(publish?'Synthetische Testfreigabe; keine Website veröffentlicht.':'Entwurf im synthetischen Browser-Speicher gesichert.');};
  const loadSession=()=>{try{const saved=JSON.parse(localStorage.getItem('pasaport-admin-synthetic-v1')??'null');if(!saved||!Number.isSafeInteger(saved.revision))throw Error();const clean={...saved,draft:{page:sanitizeDemoPage(saved.draft.page),theme:sanitizeTheme(saved.draft.theme),chrome:sanitizeStorefront(saved.draft.chrome,'global')}} as EditorSession;setSession(clean);install(clean.draft);setSessionMessage('Synthetischen Entwurf neu geladen.');}catch{setSessionMessage('Kein gültiger synthetischer Entwurf.');}};
  const [selected, setSelected] = useState("hero");
  const [locale, setLocale] = useState<UiLocale>("tr");
  const [width, setWidth] = useState(390);
  const [previewTarget,setPreviewTarget]=useState<"offline"|"website">("offline");
  const frame = useRef<HTMLIFrameElement>(null);
  const section = config.sections.find(s => s.id === selected)??config.sections[0]!;
  const patch = (patch: Partial<V2Section>) => setConfig(value => sanitizeDemoPage({ ...value, sections: value.sections.map(s => s.id === selected ? { ...s, ...patch } : s) }));
  const send = () => {
    const active=view==='published'?session.published:{page:config,theme,chrome};
    const target=frame.current?.contentWindow;if(!target)return;
    if(previewTarget==='website'){
      target.postMessage({type:'v2-cms-preview',page:'esim',config:active.page,media:Object.fromEntries(Object.entries(IMAGES).map(([id,url])=>[id,{url,alt:''}])),locale},location.origin);
      target.postMessage({type:'v2-theme-preview',theme:active.theme},location.origin);
      target.postMessage({type:'v2-chrome-preview',config:active.chrome},location.origin);
    }else target.postMessage({type:CHANNEL,config:active.page,theme:active.theme,chrome:active.chrome,locale,account:tab==='Kundenkonto'},location.origin);
  };
  useEffect(send, [config, locale,theme,chrome,tab,view,session,previewTarget]);
  useEffect(()=>{const receive=(event:MessageEvent)=>{
    if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
    if(['v2-cms-ready','v2-theme-ready','v2-chrome-ready'].includes(event.data?.type)){send();return;}
    if([CHANNEL+'-select','v2-cms-select'].includes(event.data?.type)&&config.sections.some(s=>s.id===event.data.id)){setSelected(event.data.id);setTab('Seiten');}
  };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[config,theme,chrome,locale,tab,view,session,previewTarget]);
  const design = section.design ?? DESIGN;
  const routeTabs:Record<string,string>={'/admin/storefront/v2/esim':'Seiten','/admin/theme':'Design','/admin/media':'Medien','/admin/storefront/navigation':'Menü & Footer'};
  const navigateTab=(name:string)=>{setTab(name);setMobileOpen(false);};
  return <AdminWorkspaceShell title="V2 · eSIM ana sayfası" mobileOpen={mobileOpen} onMobileOpen={setMobileOpen}
    navigation={<div className="admin-preview-nav">{ADMIN_GROUPS.map(group=><details key={group.label} open><summary>{group.label}</summary>{group.links.map(({to,label,icon:Icon,hash})=><a key={label} href={to} aria-current={routeTabs[to]===tab&&!hash?'page':undefined} onClick={e=>{if(routeTabs[to]){e.preventDefault();navigateTab(hash?'Sprachen':routeTabs[to]!);}}} {...(!routeTabs[to]?{target:'_blank',rel:'noreferrer'}:{})}><Icon/>{label}</a>)}</details>)}</div>}
    actions={<span className="admin-synthetic-badge">İzole önizleme</span>}>
   <div className="builder-demo" data-admin-workspace dir="ltr">
    <p className="builder-disclosure">Mevcut yönetim bileşenleri · sentetik kayıt/çeviri. Mevcut veritabanına, Storage'a veya üretime yazılmaz. Katalog ve yorum verileri bağlı değildir. Tam canlı sayfa ve gerçek medya yükleme yalnız mevcut yetkili yönetimde kullanılabilir.</p>
    <nav className="builder-tabs" aria-label="Admin-Baukasten">{['Seiten','Design','Medien','Menü & Footer','Sprachen','Kundenkonto','Versionen','Fachmodule'].map(name=><button type="button" key={name} aria-pressed={tab===name} onClick={()=>navigateTab(name)}>{name}</button>)}</nav>
    <section className="builder-page-actions"><strong>V2 · eSIM</strong><button onClick={()=>saveSession(false)}>Taslak kaydet</button><button onClick={()=>{if(confirm('Yalnız sentetik önizlemeye uygula?'))saveSession(true);}}>Önizlemeye uygula</button><button onClick={()=>navigateTab('Versionen')}>Geçmiş</button><a href="/admin/storefront/v2/esim" target="_blank" rel="noreferrer">Tam yetkili editörü aç</a></section>
    <div className="builder-workspace"><aside>
     {tab==='Seiten'&&<section className="builder-section-list"><h2>Bölümler</h2><SectionLibrary count={config.sections.length} selected={section} onAdd={next=>{if(config.sections.length>=SECTION_LIMIT)return;setConfig({...config,sections:[...config.sections,next]});setSelected(next.id);}}/>{config.sections.map((s,i)=><div key={s.id} className={s.id===selected?'selected':''}><button className="section-select" aria-label={'Bölüm: '+s.id} onClick={()=>setSelected(s.id)}><span>{V2_PROTECTED.includes(s.type)?'🔒':'⠿'}</span><span>{V2_SECTION_LABELS[s.type]}<small>{s.text['title']?.tr||s.id}</small></span></button>{!V2_PROTECTED.includes(s.type)&&<><button aria-label={'Yukarı: '+s.id} disabled={i<=1} onClick={()=>setConfig(value=>{const rows=[...value.sections];[rows[i-1],rows[i]]=[rows[i]!,rows[i-1]!];return {...value,sections:rows};})}>↑</button><button aria-label={'Aşağı: '+s.id} disabled={i===config.sections.length-1} onClick={()=>setConfig(value=>{const rows=[...value.sections];[rows[i+1],rows[i]]=[rows[i]!,rows[i+1]!];return {...value,sections:rows};})}>↓</button><button aria-label={'Görünürlük: '+s.id} aria-pressed={s.visible} onClick={()=>setConfig(value=>({...value,sections:value.sections.map(row=>row.id===s.id?{...row,visible:!row.visible}:row)}))}>{s.visible?'◉':'○'}</button></>}</div>)}</section>}

      <label>Ansicht<select aria-label="Entwurf oder Testfreigabe" value={view} onChange={e=>setView(e.target.value)}><option value="draft">Entwurf</option><option value="published">Freigegebene synthetische Ansicht</option></select></label>
      <label>Vorschau in:<select aria-label="Vorschau in" value={locale} onChange={e => setLocale(e.target.value as UiLocale)}>{UI_LOCALES.map(code => <option key={code} value={code}>{LOCALE_REGISTRY[code].nativeName}</option>)}</select></label>
      {tab==='Design'&&<UnifiedThemeControls value={theme} onChange={setTheme}/>}
      {(tab==='Menü & Footer'||tab==='Kundenkonto')&&<ChromeControls value={chrome} onChange={setChrome}/>}
      {(tab==='Sprachen'||tab==='Menü & Footer')&&<V2PageTranslation page={chromeTranslationPage(chrome)} onChange={p=>setChrome(current=>applyChromeTranslation(current,p))} demo transport={demoTransport}/>}
      {tab==='Versionen'&&<section><button type="button" onClick={()=>saveSession(false)}>Synthetischen Entwurf speichern</button><button type="button" onClick={loadSession}>Gespeicherten Entwurf laden</button><button type="button" onClick={()=>{if(confirm('Nur synthetische Testansicht freigeben? Keine Website wird veröffentlicht.'))saveSession(true);}}>Synthetische Testfreigabe</button><p data-session-status>{sessionMessage}</p>{session.versions.map((v,i)=><button type="button" key={v.revision} onClick={()=>{const next=restoreEditorSession(session,i);setSession(next);install(next.draft);localStorage.setItem('pasaport-admin-synthetic-v1',JSON.stringify(next));setSessionMessage('Nur Entwurf wiederhergestellt; Testfreigabe unverändert.');}}>Revision {v.revision} · {v.event} → Entwurf</button>)}</section>}
      {tab==='Fachmodule'&&<section><p>Vorhandene echte Module bleiben unter Anmeldung erreichbar. Die Vorschau greift nicht auf ihre Daten zu.</p>{['products','orders','customers','providers','finance','refunds','audit','content/seo','media','theme','security','cms'].map(module=><a className="block" key={module} href={'/admin/'+module} target="_blank" rel="noreferrer">{module} → bestehender Admin (Anmeldung)</a>)}</section>}
      <div hidden={!['Seiten','Medien','Sprachen'].includes(tab)}>

      <label>Abschnitt<select aria-label="Abschnitt" value={selected} onChange={e => setSelected(e.target.value)}>{config.sections.map(s => <option key={s.id} value={s.id}>{s.type}</option>)}</select></label>

      <V2PageTranslation page={config} onChange={setConfig} demo transport={demoTransport}/>
      <V2TurkishTextEditor key={selected} section={section} onChange={patch} previewLocale={locale} demo />

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
      {section.type==='EDITORIAL_SECTION'&&<EditorialSectionEditor section={section} onChange={patch} picker={(label,id,onPick)=><select aria-label={`free-image-${label}`} value={id??''} onChange={e=>onPick(e.target.value||null)}><option value="">Görsel yok</option>{IMAGE_IDS.map((key,index)=><option key={key} value={key}>{index?'Teras':'Kıyı'}</option>)}</select>}/>}
      {section.type!=='EDITORIAL_SECTION'&&section.items.filter(i=>i.cardType!=='review'&&!i.entity).map(item=><fieldset key={item.id} data-editor-item={item.id}><legend>{item.id}</legend><CardDesignControls id={item.id} value={item.cardDesign} onChange={cardDesign=>patch({items:section.items.map(i=>i.id===item.id?{...i,cardDesign}:i)})}/><EditorialItemControls item={item} onChange={value=>patch({items:section.items.map(i=>i.id===item.id?{...i,...value}:i)})}/><ResponsiveMediaControls value={item} onChange={value=>patch({items:section.items.map(i=>i.id===item.id?{...i,...value}:i)})} picker={(label,id,onChange)=><select aria-label={`item-media-${item.id}-${label}`} value={id??''} onChange={e=>onChange(e.target.value||null)}><option value="">Kein Bild</option>{IMAGE_IDS.map((id,i)=><option key={id} value={id}>{i?'Terrasse':'Küste'}</option>)}</select>}/></fieldset>)}
      <button type="button" onClick={()=>{const next=createV2Section('INFO_GRID');next.id='security-'+crypto.randomUUID().slice(0,8);next.schemaVersion=1;next.variant='security';next.text={title:demoLT('Bilgi')};setConfig({...config,sections:[...config.sections,next]});setSelected(next.id);}} disabled={config.sections.length>=SECTION_LIMIT}>Güven kartları ekle</button>
      {section.type==='INFO_GRID'&&<button type="button" onClick={()=>{if(section.items.length>=30)return;const id='card-'+crypto.randomUUID().slice(0,8);const original=defaultV2Page('esim').sections.find(s=>s.items.length)!.items[0]!;patch({items:[...section.items,{...original,id,entity:'',cardType:'info',visible:true,icon:'ShieldCheck',title:demoLT(''),text:demoLT(''),cta:demoLT(''),imageAlt:demoLT(''),labels:[],mediaId:null,href:''}]});}}>Kart ekle</button>}
      {section.type!=='EDITORIAL_SECTION'&&section.items.map((item,index)=><div key={item.id} className="flex flex-wrap gap-2"><button aria-label={'Kart yukarı: '+item.id} disabled={index===0} onClick={()=>{const rows=[...section.items];[rows[index-1],rows[index]]=[rows[index]!,rows[index-1]!];patch({items:rows});}}>↑ {index+1}</button><button aria-label={'Kart görünürlük: '+item.id} aria-pressed={item.visible} onClick={()=>patch({items:section.items.map(i=>i.id===item.id?{...i,visible:!i.visible}:i)})}>◉ {index+1}</button><button aria-label={'Kart kaldır: '+item.id} onClick={()=>patch({items:section.items.filter(i=>i.id!==item.id)})}>Kaldır {index+1}</button></div>)}

      {section.type!=='SEARCH_HERO'&&<div className="flex flex-wrap gap-2"><button type="button" onClick={()=>patch({visible:!section.visible})}>Sichtbarkeit</button><button type="button" onClick={()=>{if(config.sections.length>=SECTION_LIMIT)return;const copy=cloneEditorialSection(section);setConfig({...config,sections:[...config.sections,copy]});setSelected(copy.id);}}>Abschnitt duplizieren</button><button type="button" onClick={()=>{const rows=config.sections.filter(s=>s.id!==section.id);setConfig({...config,sections:rows});setSelected('hero');}}>Abschnitt entfernen</button><button type="button" onClick={()=>{const i=config.sections.findIndex(s=>s.id===section.id);if(i>1){const rows=[...config.sections];[rows[i-1],rows[i]]=[rows[i]!,rows[i-1]!];setConfig({...config,sections:rows});}}}>Abschnitt nach oben</button></div>}
      </div>
      <button type="button" onClick={() => {const base={page:initial(),theme:DEFAULT_THEME,chrome:defaultStorefront('global')};install(base);setSession(newEditorSession(base));setSelected('hero');setTab('Seiten');setView('draft');localStorage.removeItem('pasaport-admin-synthetic-v1');}}>Vorher / vollständig zurücksetzen</button>
      <p>Dieselben Schrift-/Farbkontrollen und Renderer werden im echten V2-Admin verwendet. Dort: /admin/storefront/v2/esim → SEARCH_HERO oder NOTICE → Entwurf/Vorschau. Bestehende Anmeldung und Freigabe bleiben erforderlich.</p>
    </aside><section className="builder-preview-panel"><label>Önizleme kaynağı<select aria-label="Önizleme kaynağı" value={previewTarget} onChange={e=>setPreviewTarget(e.target.value as 'offline'|'website')}><option value="offline">İzole tam sayfa · veri bağlantısı yok</option><option value="website">Gerçek tam web sitesi · mevcut V2 renderer</option></select></label>{previewTarget==='website'&&<p className="builder-disclosure">Bu çerçeve gerçek /esim sayfasıdır; yayımlanmış verileri okur. Taslak, tema ve menü yalnız bu çerçevede önizlenir; kaydetmez/yayınlamaz. Mevcut sunucu ve veri bağlantısı gerekir. Kütüphane medyası için yetkili editörü kullan.</p>}<div className="builder-toolbar">{[390, 768, 1440].map(w => <button key={w} type="button" aria-pressed={width === w} onClick={() => setWidth(w)}>{w} px</button>)}<a href={new URLSearchParams(window.location.search).has("fixture")?"?canvas=1&fixture=translation":(new URLSearchParams(window.location.search).has("reference")?"?canvas=1&reference=1":"?canvas=1")} target="_blank" rel="noreferrer">Standard separat öffnen</a></div>
      <ResponsivePreview width={width} height={850}>{scale=><iframe key={previewTarget} title="V2 Entwurfsvorschau" name="v2-cms-preview" ref={frame} src={previewTarget==='website'?"/esim?country=":new URLSearchParams(window.location.search).has("fixture")?"?canvas=1&fixture=translation":(new URLSearchParams(window.location.search).has("reference")?"?canvas=1&reference=1":"?canvas=1")} onLoad={send} style={{ width, height: Math.ceil(850/scale), transform:`scale(${scale})`,transformOrigin:"top left",border:0 }} />}</ResponsivePreview>
    </section></div>
  </div></AdminWorkspaceShell>;
}

createRoot(document.getElementById("root")!).render(new URLSearchParams(window.location.search).has("canvas") ? <Canvas /> : <BuilderDemo />);
