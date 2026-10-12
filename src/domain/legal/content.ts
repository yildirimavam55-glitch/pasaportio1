import { UI_LOCALES, type UiLocale } from "@/i18n/locales";

export const LEGAL_DOCUMENTS = ["imprint", "privacy", "terms", "withdrawal", "refund", "cookies"] as const;
export type LegalDocumentId = (typeof LEGAL_DOCUMENTS)[number];
export type LocaleMap = Record<UiLocale, string>;
type LegalSection = { id: string; heading: LocaleMap; body: LocaleMap; reviewRequired: boolean };
type LegalTemplate = { id: LegalDocumentId; status: "DRAFT" | "PUBLISHED"; title: LocaleMap; lastUpdated: string; sections: LegalSection[] };
export type CompanyInformation = { legalName:string; brandName:string; legalForm:string; representative:string; street:string; houseNumber:string; postalCode:string; city:string; country:string; email:string; telephone:string; commercialRegister:string; registerCourt:string; registrationNumber:string; vatId:string; businessId:string; responsibleContact:string; disputeResolutionStatus:string; supervisoryAuthority:string };

export const localeMap = (tr:string,de:string,en:string):LocaleMap => Object.fromEntries(UI_LOCALES.map(l=>[l,l==="tr"?tr:l==="de"?de:en])) as LocaleMap;
const s=(id:string,tr:string,de:string,en:string,btr:string,bde:string,ben:string,reviewRequired=true):LegalSection=>({id,heading:localeMap(tr,de,en),body:localeMap(btr,bde,ben),reviewRequired});
const company:CompanyInformation={legalName:"",brandName:"pasaport.io",legalForm:"",representative:"",street:"",houseNumber:"",postalCode:"",city:"",country:"",email:"",telephone:"",commercialRegister:"",registerCourt:"",registrationNumber:"",vatId:"",businessId:"",responsibleContact:"",disputeResolutionStatus:"",supervisoryAuthority:""};
const missing=localeMap("EKSİK YASAL BİLGİ","FEHLENDE RECHTLICHE ANGABEN","MISSING LEGAL INFORMATION");

const docs:Record<LegalDocumentId,LegalTemplate>={
 imprint:{id:"imprint",status:"DRAFT",title:localeMap("Impressum / Yasal Bilgiler","Impressum","Legal Notice"),lastUpdated:"",sections:[
  s("provider","Hizmet sağlayıcı","Diensteanbieter","Service provider",missing.tr,missing.de,missing.en),
  s("contact","Adres ve iletişim","Anschrift und Kontakt","Address and contact","Şirket adresi, e-posta ve uygulanabilirse telefon bilgisi sahibi tarafından tamamlanmalıdır.","Anschrift, E-Mail und gegebenenfalls Telefon müssen vom Inhaber ergänzt werden.","Company address, email and, where applicable, telephone must be completed by the owner."),
  s("register","Sicil ve vergi bilgileri","Register- und Steuerangaben","Register and tax details","Uygulanabilir ticaret sicili, mahkeme, kayıt numarası ve KDV kimliği doğrulanmalıdır.","Anwendbares Register, Gericht, Registernummer und USt-IdNr. müssen bestätigt werden.","Applicable register, court, registration number and VAT details must be confirmed."),
  s("dispute","Tüketici uyuşmazlıkları","Verbraucherstreitbeilegung","Consumer dispute resolution","Katılım durumu seçilmeden kamuya açık bir beyan gösterilmez.","Ohne Entscheidung wird keine Teilnahmeerklärung veröffentlicht.","No participation statement is shown until the owner decides."),
 ]},
 privacy:{id:"privacy",status:"DRAFT",title:localeMap("Gizlilik Politikası","Datenschutzerklärung","Privacy Policy"),lastUpdated:"",sections:[
  s("controller","Veri sorumlusu ve iletişim","Verantwortlicher und Kontakt","Controller and contact",missing.tr,missing.de,missing.en),
  s("account","Hesap ve kimlik doğrulama","Konto und Anmeldung","Account and authentication","Hesap kaydı, oturum güvenliği ve müşteri tercihleri için gerekli veriler işlenir; ayrıntılar doğrulanmalıdır.","Erforderliche Daten für Konto, Sitzungssicherheit und Einstellungen werden verarbeitet; Details sind zu prüfen.","Data needed for accounts, session security and preferences is processed; details require review."),
  s("orders","Siparişler ve hizmet sunumu","Bestellungen und Leistung","Orders and service delivery","Sipariş ve eSIM sağlama için gerekli veriler işlenebilir. Şu anda canlı ödeme sağlayıcısı etkin değildir.","Für Bestellungen und eSIM-Bereitstellung können erforderliche Daten verarbeitet werden. Derzeit ist kein Live-Zahlungsanbieter aktiv.","Data required for orders and eSIM provisioning may be processed. No live payment provider is currently active."),
  s("support","Destek ve iletişim","Support und Kommunikation","Support and communications","WhatsApp bağlantısı harici uygulamayı açar. İşlemsel mesajlar ile gönüllü newsletter ayrı tutulur; otomatik abonelik yoktur.","WhatsApp öffnet eine externe App. Transaktionale Nachrichten und freiwillige Newsletter bleiben getrennt; keine automatische Anmeldung.","WhatsApp opens an external app. Transactional messages and voluntary newsletters remain separate; there is no automatic subscription."),
  s("storage","Teknik depolama ve günlükler","Technische Speicherung und Protokolle","Technical storage and logs","Sepet, dil, tema ve cihaz uyumluluğu için gerekli tarayıcı depolaması kullanılabilir. Aktif üçüncü taraf pazarlama analitiği tespit edilmemiştir.","Erforderlicher Browserspeicher kann für Warenkorb, Sprache, Design und Kompatibilität genutzt werden. Aktive Drittanbieter-Marketinganalyse wurde nicht festgestellt.","Necessary browser storage may support cart, language, theme and compatibility. No active third-party marketing analytics were identified."),
  s("rights","Saklama, hukuki dayanaklar ve haklar","Speicherung, Rechtsgrundlagen und Rechte","Retention, legal bases and rights","Saklama süreleri, hukuki dayanaklar, erişim, düzeltme, silme, itiraz, rıza geri alma ve şikâyet hakkı hukuk incelemesi gerektirir.","Speicherdauer, Rechtsgrundlagen und Betroffenenrechte bedürfen rechtlicher Prüfung.","Retention, legal bases and data-subject rights require legal review."),
 ]},
 terms:{id:"terms",status:"DRAFT",title:localeMap("Kullanım ve Satış Koşulları","Allgemeine Geschäftsbedingungen","Terms & Conditions"),lastUpdated:"",sections:[
  s("general","Genel sözleşme kuralları","Allgemeine Vertragsregeln","General contract rules","Müşteri uygunluğu, sipariş, fiyat, ödeme, sözleşme dili, hukuk ve tüketici hakları için SAHİP KARARI GEREKLİDİR.","Für Eignung, Bestellung, Preise, Zahlung, Vertragssprache, Recht und Verbraucherrechte ist eine INHABERENTSCHEIDUNG ERFORDERLICH.","OWNER DECISION REQUIRED for eligibility, ordering, prices, payment, contract language, law and consumer rights."),
  s("esim","eSIM ürünleri","eSIM-Produkte","eSIM products","Teslimat, kurulum, uyumluluk, kullanılabilirlik ve kapsama gerçek akışla doğrulanmalıdır. 5G, hız, kapsama veya kesintisiz hizmet garantisi verilmez.","Lieferung, Installation, Kompatibilität und Abdeckung müssen geprüft werden. Keine Garantie für 5G, Geschwindigkeit, Abdeckung oder unterbrechungsfreien Dienst.","Delivery, installation, compatibility and coverage must be verified. No 5G, speed, coverage or uninterrupted-service guarantee is made."),
  s("lounge","Lounge ürünleri","Lounge-Produkte","Lounge products","Rezervasyon, kullanım ve iptal koşulları için SAHİP KARARI GEREKLİDİR.","Für Buchungs-, Nutzungs- und Stornobedingungen ist eine INHABERENTSCHEIDUNG ERFORDERLICH.","OWNER DECISION REQUIRED for booking, use and cancellation terms."),
  s("vignette","Vignette ürünleri","Vignetten-Produkte","Vignette products","Ürün ve ülkeye özel kullanım, teslimat ve iptal koşulları için SAHİP KARARI GEREKLİDİR.","Für produkt- und länderspezifische Bedingungen ist eine INHABERENTSCHEIDUNG ERFORDERLICH.","OWNER DECISION REQUIRED for product- and country-specific terms."),
  s("liability","İade, sorumluluk ve destek","Erstattung, Haftung und Support","Refunds, liability and support","Yasal cayma ile gönüllü iade ayrı tutulmalıdır. Sorumluluk ve destek taahhütleri hukuk incelemesi gerektirir.","Widerruf und freiwillige Erstattung bleiben getrennt. Haftung und Support bedürfen Prüfung.","Withdrawal and voluntary refunds remain separate. Liability and support require review."),
 ]},
 withdrawal:{id:"withdrawal",status:"DRAFT",title:localeMap("Cayma Hakkı","Widerrufsbelehrung","Withdrawal Information"),lastUpdated:"",sections:[
  s("overview","Genel bilgi","Allgemeine Informationen","General information","Dijital ve seyahat hizmetlerinde tek genel kural varsayılmamıştır. HUKUK İNCELEMESİ GEREKLİDİR.","Es wird keine einheitliche Regel unterstellt. RECHTLICHE PRÜFUNG ERFORDERLICH.","No single generic rule is assumed. LEGAL REVIEW REQUIRED."),
  s("esim","eSIM","eSIM","eSIM","İfa başlangıcı ve cayma ilişkisi satın alma ve teslim akışı doğrulandıktan sonra belirlenmelidir.","Leistungsbeginn und Widerruf sind nach Prüfung des Ablaufs festzulegen.","Performance commencement and withdrawal must be decided after the fulfilment flow is confirmed."),
  s("lounge","Lounge","Lounge","Lounge","Rezervasyon tarihi, hizmet zamanı ve iptal koşulları doğrulanmalıdır.","Buchungsdatum, Leistungszeitpunkt und Stornobedingungen sind zu bestätigen.","Booking date, service timing and cancellation terms must be confirmed."),
  s("vignette","Vignette","Vignette","Vignette","Ürün ve ülkeye özgü sonuçlar hukuk incelemesi gerektirir.","Produkt- und länderspezifische Folgen bedürfen Prüfung.","Product- and country-specific implications require legal review."),
 ]},
 refund:{id:"refund",status:"DRAFT",title:localeMap("İade Politikası","Erstattungsrichtlinie","Refund Policy"),lastUpdated:"",sections:[
  s("statutory","Yasal cayma hakları","Gesetzliche Widerrufsrechte","Statutory withdrawal rights","Yasal haklar gönüllü iade politikasından ayrıdır; nihai metin inceleme gerektirir.","Gesetzliche Rechte sind von der freiwilligen Erstattung getrennt.","Statutory rights are separate from the voluntary refund policy."),
  s("voluntary","pasaport.io gönüllü iade güvencesi","Freiwillige pasaport.io-Erstattung","pasaport.io voluntary refund promise","Mevcut ilke: uygun ve KULLANILMAMIŞ eSIM alımları için 14 günlük iade güvencesi. Bu koşulsuz iade değildir.","Aktuelles Prinzip: 14 Tage für berechtigte, UNGENUTZTE eSIM-Käufe. Keine bedingungslose Erstattung.","Current principle: 14 days for eligible UNUSED eSIM purchases. This is not an unconditional refund."),
  s("process","Talep ve ödeme iadesi","Antrag und Zahlungsrückerstattung","Request and payment refund","İç iade talebi gerçek ödeme sağlayıcısı iadesi değildir. Gerçek iade ancak sağlayıcı onayıyla tamamlanır.","Ein interner Antrag ist keine tatsächliche Rückzahlung. Diese ist erst mit Anbieterbestätigung abgeschlossen.","An internal request is not a real payment-provider refund. A real refund completes only with provider confirmation."),
 ]},
 cookies:{id:"cookies",status:"DRAFT",title:localeMap("Çerezler ve Gizlilik Ayarları","Cookies & Datenschutzeinstellungen","Cookies & Privacy Settings"),lastUpdated:"",sections:[
  s("essential","Zorunlu","Essenziell","Essential","Oturum güvenliği ve temel işlevler için gereklidir; devre dışı bırakılamaz.","Für Sitzungssicherheit und Kernfunktionen erforderlich; nicht deaktivierbar.","Required for session security and core functions; cannot be disabled.",false),
  s("functional","İşlevsel","Funktional","Functional","Dil, tema, sepet, kampanya görünümü ve uyumluluk tercihleri için tarayıcı depolaması.","Browserspeicher für Sprache, Design, Warenkorb, Kampagnen und Kompatibilität.","Browser storage for language, theme, cart, campaign display and compatibility."),
  s("analytics","Analitik","Analyse","Analytics","Şu anda aktif üçüncü taraf analitik izleyicisi tespit edilmemiştir. Gelecekte eklenirse gerekli ön onay olmadan etkinleştirilmez.","Derzeit kein aktiver Drittanbieter-Tracker festgestellt. Künftige optionale Technik bleibt ohne erforderliche Einwilligung aus.","No active third-party analytics tracker is identified. Future optional technology stays off without required prior consent."),
  s("marketing","Pazarlama","Marketing","Marketing","Varsayılan olarak kapalıdır. Newsletter gönüllüdür ve ayrı açık rıza gerektirir.","Standardmäßig aus. Newsletter sind freiwillig und erfordern separate Einwilligung.","Off by default. Newsletters are voluntary and require separate explicit consent."),
 ]},
};

/* ------------------------------------------------------------------ */
/* Owner-editable legal content model (stored in the existing CMS rows). */
/* ------------------------------------------------------------------ */

export type TranslationStatus = "SOURCE" | "AUTO" | "MANUAL" | "EMPTY";
export type TranslationMeta = { status: TranslationStatus; sourceHash: string };
/** `body` uses a small safe text format (see LegalRichText) — never HTML. */
export type LegalDocument = {
  id: LegalDocumentId;
  title: LocaleMap;
  body: LocaleMap;
  lastUpdated: string;
  reviewRequired: boolean;
  translations: Record<UiLocale, TranslationMeta>;
};
export type PublishedLegalDocument = LegalDocument & { publishedAt: string };
export type LegalCenterConfig = { company: CompanyInformation; documents: Record<LegalDocumentId, LegalDocument> };
export type PublishedLegalCenter = { company: CompanyInformation; documents: Partial<Record<LegalDocumentId, PublishedLegalDocument>> };

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentId, string> = {
  imprint: "Impressum / Yasal Bilgiler", privacy: "Gizlilik Politikası", terms: "Kullanım ve Satış Koşulları",
  withdrawal: "Cayma Hakkı", refund: "İade Politikası", cookies: "Çerezler ve Gizlilik",
};
export const LEGAL_ROUTES: Record<LegalDocumentId, string> = {
  imprint: "/legal/imprint", privacy: "/legal/privacy", terms: "/legal/terms",
  withdrawal: "/legal/withdrawal", refund: "/legal/refund", cookies: "/legal/cookies",
};

/** Stable short hash of the Turkish master text; used to detect outdated translations. */
export function sourceHash(doc: Pick<LegalDocument, "title" | "body">) {
  const input = `${doc.title.tr}\u0000${doc.body.tr}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
export const isOutdated = (doc: LegalDocument, locale: UiLocale) =>
  locale !== "tr" && doc.translations[locale].status !== "EMPTY" && doc.translations[locale].sourceHash !== sourceHash(doc);

const templateBody = (t: LegalTemplate, l: UiLocale) =>
  l === "tr" || l === "de" || l === "en" ? t.sections.map((s) => `## ${s.heading[l]}\n\n${s.body[l]}`).join("\n\n") : "";

function templateDoc(t: LegalTemplate): LegalDocument {
  const doc: LegalDocument = {
    id: t.id, lastUpdated: "", reviewRequired: true,
    title: Object.fromEntries(UI_LOCALES.map((l) => [l, l === "tr" || l === "de" || l === "en" ? t.title[l] : ""])) as LocaleMap,
    body: Object.fromEntries(UI_LOCALES.map((l) => [l, templateBody(t, l)])) as LocaleMap,
    translations: {} as Record<UiLocale, TranslationMeta>,
  };
  const hash = sourceHash(doc);
  doc.translations = Object.fromEntries(UI_LOCALES.map((l) => [l, { status: l === "tr" ? "SOURCE" : doc.body[l] ? "MANUAL" : "EMPTY", sourceHash: l === "de" || l === "en" ? hash : "" }])) as Record<UiLocale, TranslationMeta>;
  return doc;
}

/** Editable starter outline only — never rendered publicly until the owner publishes. */
export const DEFAULT_LEGAL_CENTER: LegalCenterConfig = {
  company,
  documents: Object.fromEntries(LEGAL_DOCUMENTS.map((id) => [id, templateDoc(docs[id])])) as Record<LegalDocumentId, LegalDocument>,
};
export const EMPTY_PUBLISHED: PublishedLegalCenter = { company, documents: {} };

const clean = (v: unknown, max: number) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\r\n/g, "\n").slice(0, max);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const cleanMap = (v: unknown, max: number, f: LocaleMap) => {
  const src = obj(v);
  return Object.fromEntries(UI_LOCALES.map((l) => [l, typeof src[l] === "string" ? clean(src[l], max) : f[l]])) as LocaleMap;
};
const cleanCompany = (v: unknown) => {
  const src = obj(v);
  return Object.fromEntries(Object.keys(company).map((k) => [k, typeof src[k] === "string" ? clean(src[k], 240).trim() : (company as Record<string, string>)[k]])) as CompanyInformation;
};

function sanitizeDocument(id: LegalDocumentId, raw: unknown): LegalDocument {
  const fallback = DEFAULT_LEGAL_CENTER.documents[id];
  const src = obj(raw);
  if (!("body" in src)) return { ...fallback };
  const meta = obj(src["translations"]);
  return {
    id,
    title: cleanMap(src["title"], 200, fallback.title),
    body: cleanMap(src["body"], 40000, fallback.body),
    lastUpdated: /^\d{4}-\d{2}-\d{2}$/.test(String(src["lastUpdated"] ?? "")) ? String(src["lastUpdated"]) : "",
    reviewRequired: src["reviewRequired"] !== false,
    translations: Object.fromEntries(UI_LOCALES.map((l) => {
      const m = obj(meta[l]);
      const status = (["SOURCE", "AUTO", "MANUAL", "EMPTY"] as const).find((s) => s === m["status"]) ?? (l === "tr" ? "SOURCE" : "EMPTY");
      return [l, { status: l === "tr" ? "SOURCE" : status, sourceHash: clean(m["sourceHash"], 20) }];
    })) as Record<UiLocale, TranslationMeta>,
  };
}

export function sanitizeLegalCenter(raw: unknown): LegalCenterConfig {
  const src = obj(raw);
  const documents = obj(src["documents"]);
  return {
    company: cleanCompany(src["company"]),
    documents: Object.fromEntries(LEGAL_DOCUMENTS.map((id) => [id, sanitizeDocument(id, documents[id])])) as Record<LegalDocumentId, LegalDocument>,
  };
}

export function sanitizePublishedLegalCenter(raw: unknown): PublishedLegalCenter {
  const src = obj(raw);
  const documents = obj(src["documents"]);
  const out: Partial<Record<LegalDocumentId, PublishedLegalDocument>> = {};
  for (const id of LEGAL_DOCUMENTS) {
    const d = obj(documents[id]);
    if (!("body" in d)) continue;
    out[id] = { ...sanitizeDocument(id, d), publishedAt: clean(d["publishedAt"], 40) };
  }
  return { company: cleanCompany(src["company"]), documents: out };
}

export const REQUIRED_COMPANY_FIELDS: Array<keyof CompanyInformation> = ["legalName", "legalForm", "representative", "street", "houseNumber", "postalCode", "city", "country", "email", "responsibleContact", "disputeResolutionStatus"];
export const MISSING_LABEL = "Eksik bilgi";

/** Builds an editable Turkish Impressum outline from stored company data. Missing values stay marked, never invented. */
export function impressumFromCompany(c: CompanyInformation) {
  const v = (value: string) => value.trim() || `**${MISSING_LABEL}**`;
  const email = c.email.trim() ? `[${c.email.trim()}](mailto:${c.email.trim()})` : `**${MISSING_LABEL}**`;
  return [
    "# Impressum / Yasal Bilgiler",
    "## Hizmet sağlayıcı",
    `${v(c.legalName)}${c.legalForm.trim() ? ` (${c.legalForm.trim()})` : ""}\nMarka: ${v(c.brandName)}`,
    `${v(c.street)} ${c.houseNumber.trim() || `**${MISSING_LABEL}**`}\n${v(c.postalCode)} ${v(c.city)}\n${v(c.country)}`,
    "## Temsil yetkilisi",
    v(c.representative),
    "## İletişim",
    `- E-posta: ${email}\n- Telefon: ${v(c.telephone)}`,
    "## Sicil ve vergi bilgileri",
    `- Ticaret sicili: ${v(c.commercialRegister)}\n- Sicil mahkemesi: ${v(c.registerCourt)}\n- Kayıt numarası: ${v(c.registrationNumber)}\n- KDV kimliği / USt-IdNr.: ${v(c.vatId)}\n- İşletme / vergi kimliği: ${v(c.businessId)}`,
    "## İçerikten sorumlu",
    v(c.responsibleContact),
    "## Tüketici uyuşmazlık çözümü",
    v(c.disputeResolutionStatus),
  ].join("\n\n");
}
