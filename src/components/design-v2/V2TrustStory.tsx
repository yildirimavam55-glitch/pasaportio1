import {
  Check,
  CheckCircle2,
  CreditCard,
  Headphones,
  MapPin,
  Plane,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wifi,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WhatsAppLogo } from "@/components/travel/WhatsAppLogo";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";

const COMMERCIAL = {
  roamingDaily: "10–15 €",
  esimFrom: {
    tr: "1,99 €'dan",
    de: "ab 1,99 €",
    en: "from €1.99",
  },
} as const;

const COPY = localize({
  tr: {
    eyebrow: "Neden bizi tercih etmelisin?",
    introTitle: "Seyahat et.\nGerisini bize bırak.",
    introText: "Bağlantın hazır olduğunda, seyahat daha kolay.",
    refundTitle: "Planların değişebilir.\nRisk almak zorunda değilsin.",
    refundHighlight: "14 gün koşulsuz iade",
    refundText: "Kullanılmamış eSIM'ini 14 gün içinde kolayca iade edebilirsin.",
    connectionTitle: "İndiğin anda\nbağlantın hazır.",
    connectionText: "Satın al. QR kodunu al. Bağlan.",
    connectionSecondary: "Fiziksel SIM bekleme. Mağaza arama.",
    active: "eSIM aktif",
    ready: "Bağlantı hazır",
    roamingTitle: "Roaming sürprizlerini\ngeride bırak.",
    roamingText: "Ne kadar ödeyeceğini seyahatten önce bil.",
    roaming: "Operatör Roaming",
    daily: "/ günlük",
    esim: "eSIM",
    packagesFrom: "başlayan paketler",
    predictable: "Önceden belli fiyat. Ek roaming sürprizi yok.",
    supportTitle: "Bir sorun olursa,\nyalnız değilsin.",
    supportLead: "Gerçek destek. Gerçek insanlar.",
    supportText: "WhatsApp üzerinden bize ulaşabilirsin.",
    supportHello: "Merhaba 👋",
    supportQuestion: "Size nasıl yardımcı olabiliriz?",
    online: "Çevrimiçi",
    finalTitle: "İçin rahat olsun.\nBiz buradayız.",
    securePayment: "Güvenli ödeme",
    refundShort: "14 gün iade",
    fastDelivery: "Hızlı teslimat",
    whatsappSupport: "WhatsApp destek",
    storyProgress: "Güven hikâyesi ilerlemesi",
  },
  de: {
    eyebrow: "Warum solltest du uns wählen?",
    introTitle: "Reise los.\nDen Rest überlass uns.",
    introText: "Wenn deine Verbindung bereit ist, wird Reisen einfacher.",
    refundTitle: "Pläne können sich ändern.\nDu musst kein Risiko eingehen.",
    refundHighlight: "14 Tage Rückgabe ohne Wenn und Aber",
    refundText: "Eine ungenutzte eSIM kannst du innerhalb von 14 Tagen einfach zurückgeben.",
    connectionTitle: "Bei der Landung\nbist du verbunden.",
    connectionText: "Kaufen. QR-Code erhalten. Verbinden.",
    connectionSecondary: "Keine physische SIM. Keine Shopsuche.",
    active: "eSIM aktiv",
    ready: "Verbindung bereit",
    roamingTitle: "Lass Roaming-Überraschungen\nhinter dir.",
    roamingText: "Kenne deine Kosten schon vor der Reise.",
    roaming: "Mobilfunk-Roaming",
    daily: "/ pro Tag",
    esim: "eSIM",
    packagesFrom: "Pakete",
    predictable: "Preis vorher bekannt. Keine Roaming-Überraschung.",
    supportTitle: "Wenn etwas ist,\nbist du nicht allein.",
    supportLead: "Echte Hilfe. Echte Menschen.",
    supportText: "Du erreichst uns über WhatsApp.",
    supportHello: "Hallo 👋",
    supportQuestion: "Wie können wir dir helfen?",
    online: "Online",
    finalTitle: "Du kannst beruhigt sein.\nWir sind für dich da.",
    securePayment: "Sichere Zahlung",
    refundShort: "14 Tage Rückgabe",
    fastDelivery: "Schnelle Lieferung",
    whatsappSupport: "WhatsApp-Support",
    storyProgress: "Fortschritt der Vertrauensgeschichte",
  },
  en: {
    eyebrow: "Why choose us?",
    introTitle: "Travel.\nLeave the rest to us.",
    introText: "Travel feels easier when your connection is ready.",
    refundTitle: "Plans can change.\nYou do not have to take the risk.",
    refundHighlight: "14-day unconditional refund",
    refundText: "You can easily return an unused eSIM within 14 days.",
    connectionTitle: "Connected\nthe moment you land.",
    connectionText: "Buy. Get your QR code. Connect.",
    connectionSecondary: "No physical SIM. No searching for a store.",
    active: "eSIM active",
    ready: "Connection ready",
    roamingTitle: "Leave roaming surprises\nbehind.",
    roamingText: "Know what you will pay before you travel.",
    roaming: "Operator roaming",
    daily: "/ day",
    esim: "eSIM",
    packagesFrom: "packages",
    predictable: "A clear price upfront. No roaming surprises.",
    supportTitle: "If something goes wrong,\nyou are not alone.",
    supportLead: "Real support. Real people.",
    supportText: "Reach us on WhatsApp.",
    supportHello: "Hello 👋",
    supportQuestion: "How can we help you?",
    online: "Online",
    finalTitle: "Travel with peace of mind.\nWe are here.",
    securePayment: "Secure payment",
    refundShort: "14-day refund",
    fastDelivery: "Fast delivery",
    whatsappSupport: "WhatsApp support",
    storyProgress: "Trust story progress",
  },
});

type StoryCopy = ReturnType<typeof localize<typeof COPY extends never ? never : never>>;
type Copy = (typeof COPY)["en"];

export function V2TrustStory() {
  const { locale, dir } = useI18n();
  const c = COPY[locale] as Copy;
  const rootRef = useRef<HTMLElement | null>(null);
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      const next = Math.min(4, Math.floor(progress * 5));
      setActiveScene((current) => (current === next ? current : next));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scenes = buildScenes(c);
  const price = COMMERCIAL.esimFrom[locale === "tr" || locale === "de" ? locale : "en"];
  const trustItems = [
    [CreditCard, c.securePayment],
    [ShieldCheck, c.refundShort],
    [Zap, c.fastDelivery],
    [Headphones, c.whatsappSupport],
  ] as const;

  return (
    <section ref={rootRef} aria-labelledby="trust-story-title" className="relative my-10 h-[400svh] border-y border-border lg:my-20 lg:h-[360vh]" dir={dir} data-trust-story>
      <div className="sticky top-16 h-[calc(100svh-8rem)] min-h-[31rem] overflow-hidden bg-background lg:top-20 lg:h-[calc(100svh-5rem)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-soft/45 via-background to-background" aria-hidden="true" />
        <div className="relative mx-auto grid h-full max-w-6xl grid-rows-[minmax(0,1fr)_minmax(13rem,44%)] gap-2 px-5 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:grid-rows-1 lg:items-center lg:gap-16 lg:px-10 lg:py-12">
          <div className="relative min-h-0">
            {scenes.map((scene, index) => (
              <SceneCopy key={scene.title} scene={scene} index={index} activeScene={activeScene} />
            ))}
          </div>
          <StoryVisual activeScene={activeScene} c={c} price={price} />
          <ol aria-label={c.storyProgress} className="absolute end-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 lg:end-8">
            {scenes.map((scene, index) => (
              <li key={scene.title}>
                <span className={`block rounded-full bg-primary transition-[width,height,opacity] duration-500 motion-reduce:transition-none ${index === activeScene ? "h-5 w-1.5 opacity-100" : "size-1.5 opacity-25"}`}>
                  <span className="sr-only">{index + 1}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 translate-y-full bg-background px-5 py-12 motion-reduce:hidden sm:px-8 lg:py-16">
        <TrustSummary c={c} items={trustItems} />
      </div>

      <div className="hidden bg-background px-5 py-14 motion-reduce:block sm:px-8">
        <div className="mx-auto max-w-3xl space-y-14">
          {scenes.map((scene, index) => (
            <article key={scene.title} className="border-s border-border ps-6">
              <p className="text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 whitespace-pre-line text-balance font-display text-3xl font-bold leading-tight text-foreground">{scene.title}</h3>
              {scene.highlight && <p className="mt-4 font-display text-xl font-bold text-primary">{scene.highlight}</p>}
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{scene.text}</p>
              {scene.secondary && <p className="mt-2 text-sm font-semibold text-foreground">{scene.secondary}</p>}
            </article>
          ))}
          <TrustSummary c={c} items={trustItems} />
        </div>
      </div>
    </section>
  );
}

function buildScenes(c: Copy) {
  return [
    { title: c.introTitle, text: c.introText, eyebrow: c.eyebrow },
    { title: c.refundTitle, text: c.refundText, highlight: c.refundHighlight },
    { title: c.connectionTitle, text: c.connectionText, secondary: c.connectionSecondary },
    { title: c.roamingTitle, text: c.roamingText, secondary: c.predictable },
    { title: c.supportTitle, text: c.supportText, highlight: c.supportLead },
  ];
}

function SceneCopy({ scene, index, activeScene }: { scene: ReturnType<typeof buildScenes>[number]; index: number; activeScene: number }) {
  const active = index === activeScene;
  return (
    <article
      aria-hidden={!active}
      className={`absolute inset-0 flex flex-col justify-center pe-7 transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none ${active ? "translate-y-0 opacity-100 blur-0" : index < activeScene ? "-translate-y-8 opacity-0 blur-sm" : "translate-y-8 opacity-0 blur-sm"}`}
    >
      <p className="text-xs font-bold uppercase text-primary">{scene.eyebrow ?? String(index + 1).padStart(2, "0")}</p>
      <h2 id={index === 0 ? "trust-story-title" : undefined} className="mt-3 whitespace-pre-line text-balance font-display text-4xl font-bold leading-[1.04] text-foreground sm:text-5xl lg:text-6xl">{scene.title}</h2>
      {scene.highlight && <p className="mt-5 font-display text-xl font-bold text-primary lg:text-2xl">{scene.highlight}</p>}
      <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">{scene.text}</p>
      {scene.secondary && <p className="mt-2 max-w-lg text-sm font-semibold text-foreground lg:text-base">{scene.secondary}</p>}
    </article>
  );
}

function StoryVisual({ activeScene, c, price }: { activeScene: number; c: Copy; price: string }) {
  return (
    <div className="relative flex min-h-0 items-center justify-center" aria-hidden="true">
      <div className={`absolute size-64 rounded-full bg-primary-soft transition-[transform,opacity] duration-1000 motion-reduce:transition-none sm:size-72 lg:size-96 ${activeScene === 1 ? "scale-110 opacity-100" : "scale-90 opacity-65"}`} />
      <GlobeLines />
      <Plane className={`absolute start-[8%] top-[8%] size-7 text-primary transition-[transform,opacity] duration-1000 motion-reduce:transition-none lg:start-[12%] ${activeScene >= 2 ? "translate-x-24 translate-y-8 -rotate-12 opacity-100 rtl:-translate-x-24" : "translate-x-0 translate-y-0 rotate-6 opacity-55"}`} />
      <MapPin className="absolute bottom-[7%] end-[8%] size-7 text-primary/45 lg:end-[12%]" />

      {activeScene === 1 && <div className="absolute font-display text-[9rem] font-bold leading-none text-primary/5 lg:text-[13rem]">14</div>}
      {activeScene === 1 && <ShieldCheck className="absolute size-56 text-primary/20 lg:size-80" strokeWidth={0.8} />}

      <div className={`relative z-10 h-52 w-[7.25rem] rounded-[1.65rem] bg-card p-2 shadow-panel ring-1 ring-border transition-[transform] duration-700 motion-reduce:transition-none sm:h-60 sm:w-[8.25rem] lg:h-80 lg:w-44 ${activeScene === 1 ? "scale-95" : "scale-100"}`}>
        <div className="relative h-full overflow-hidden rounded-[1.25rem] bg-background ring-1 ring-border">
          <div className="absolute start-1/2 top-2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-foreground/20 rtl:translate-x-1/2" />
          <PhoneScreen activeScene={activeScene} c={c} />
        </div>
      </div>

      <div className={`absolute inset-x-0 bottom-0 mx-auto max-w-sm transition-[opacity,transform] duration-700 motion-reduce:transition-none ${activeScene === 3 ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}>
        <PriceStory c={c} price={price} />
      </div>
    </div>
  );
}

function PhoneScreen({ activeScene, c }: { activeScene: number; c: Copy }) {
  if (activeScene === 2) {
    return <div className="flex h-full flex-col items-center justify-center gap-3 px-3 text-primary"><QrCode className="size-16 lg:size-24" /><div className="space-y-1.5 text-[10px] font-semibold lg:text-xs"><p className="flex items-center gap-1"><Check className="size-3.5" />{c.active}</p><p className="flex items-center gap-1"><Check className="size-3.5" />{c.ready}</p></div></div>;
  }
  if (activeScene === 4) {
    return <div className="flex h-full flex-col justify-center gap-2 px-2.5 text-[9px] lg:px-3 lg:text-xs"><div className="flex items-center gap-1.5 text-primary"><span className="size-1.5 rounded-full bg-success" /><strong>{c.online}</strong></div><div className="rounded-xl rounded-es-sm bg-primary-soft p-2.5 text-foreground"><strong className="block">{c.supportHello}</strong><span>{c.supportQuestion}</span></div><span className="ms-auto grid size-8 place-items-center rounded-full bg-success text-primary-foreground"><WhatsAppLogo className="size-4" /></span></div>;
  }
  if (activeScene === 1) {
    return <div className="flex h-full flex-col items-center justify-center text-primary"><ShieldCheck className="size-14 lg:size-20" /><strong className="mt-2 font-display text-3xl lg:text-4xl">14</strong></div>;
  }
  return <div className="flex h-full flex-col items-center justify-center text-primary"><Smartphone className="size-10 lg:size-14" strokeWidth={1.4} /><Wifi className="mt-4 size-7 lg:size-9" /><CheckCircle2 className="mt-3 size-5 text-success lg:size-7" /></div>;
}

function PriceStory({ c, price }: { c: Copy; price: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.15fr)] items-end gap-3 rounded-xl bg-background/95 px-3 py-3 shadow-soft ring-1 ring-border backdrop-blur-sm">
      <div className="min-w-0 opacity-45">
        <p className="truncate text-[9px] font-semibold text-muted-foreground lg:text-xs">{c.roaming}</p>
        <strong className="mt-1 block font-display text-xl text-foreground line-through decoration-1 lg:text-2xl">{COMMERCIAL.roamingDaily}</strong>
        <span className="text-[9px] text-muted-foreground">{c.daily}</span>
      </div>
      <span className="pb-4 text-sm text-primary">→</span>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-primary lg:text-xs">{c.esim}</p>
        <strong className="mt-1 block whitespace-nowrap font-display text-2xl text-primary lg:text-3xl">{price}</strong>
        <span className="text-[9px] text-muted-foreground">{c.packagesFrom}</span>
      </div>
    </div>
  );
}

function GlobeLines() {
  return <div className="absolute size-56 rounded-full border border-primary/10 sm:size-64 lg:size-80"><span className="absolute inset-x-5 top-1/2 h-px bg-primary/10" /><span className="absolute inset-y-5 start-1/2 w-px bg-primary/10" /><span className="absolute inset-8 rounded-full border border-primary/10" /></div>;
}

function TrustSummary({ c, items }: { c: Copy; items: ReadonlyArray<readonly [typeof CreditCard, string]> }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="whitespace-pre-line text-balance text-center font-display text-3xl font-bold leading-tight text-foreground lg:text-5xl">{c.finalTitle}</h2>
      <ul className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-3 border-y border-border py-4 text-xs font-semibold text-foreground sm:text-sm">
        {items.map(([Icon, label]) => <li key={label} className="flex items-center gap-1.5"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{label}</li>)}
      </ul>
    </div>
  );
}
