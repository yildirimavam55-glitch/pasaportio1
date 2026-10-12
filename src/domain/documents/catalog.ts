/**
 * Portable PDF document catalogue: the four document kinds, their editable labels (code seed),
 * the allowlisted data shape and synthetic samples. Layout lives in render.ts; nothing here
 * reads the database, supplier data, secrets, QR or activation data.
 */
import { EMAIL_LOCALES, type EmailLocale } from "@/domain/email/catalog";

export const DOCUMENT_KINDS = ["invoice", "order-summary", "credit-note", "esim-guide"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_LOCALES = EMAIL_LOCALES;
export type DocumentLocale = EmailLocale;

/** Locales whose script the bundled fonts can draw. CJK falls back to English until CJK fonts ship. */
export const RENDERABLE_LOCALES: readonly DocumentLocale[] = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "pl", "ar", "ru"];
export const RTL_DOCUMENT_LOCALES: readonly DocumentLocale[] = ["ar"];
export const COMPLETE_DOCUMENT_LOCALES: readonly DocumentLocale[] = ["tr", "de", "en"];

export const BCP47: Record<DocumentLocale, string> = {
  tr: "tr-TR", en: "en-GB", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT", pt: "pt-PT", nl: "nl-NL",
  pl: "pl-PL", ar: "ar-u-nu-latn", ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", zh: "zh-Hans",
};

export const LABEL_KEYS = [
  "title.invoice", "title.order-summary", "title.credit-note", "title.esim-guide",
  "sampleWatermark", "notValidInvoice", "notTaxDocument",
  "documentNumber", "numberPending", "issueDate", "orderNumber", "orderDate", "billedTo", "issuer", "issuerPending",
  "description", "quantity", "unitPrice", "taxRate", "net", "tax", "total", "subtotal", "discount", "grandTotal",
  "taxPending", "refundReference", "originalInvoice", "refundReason", "refundTotal",
  "guideIntro", "guideStep1", "guideStep2", "guideStep3", "guideStep4", "guideStep5", "guideSecurity",
  "footer", "page",
] as const;
export type LabelKey = (typeof LABEL_KEYS)[number];
export type DocumentLabels = Record<LabelKey, string>;

const tr: DocumentLabels = {
  "title.invoice": "Fatura", "title.order-summary": "Sipariş özeti", "title.credit-note": "İade / alacak dekontu", "title.esim-guide": "eSIM kurulum rehberi",
  sampleWatermark: "ÖRNEK", notValidInvoice: "Örnek belge — geçerli bir fatura değildir.", notTaxDocument: "Bu belge bir vergi belgesi değildir.",
  documentNumber: "Belge no", numberPending: "Düzenlenince atanır", issueDate: "Düzenleme tarihi", orderNumber: "Sipariş no", orderDate: "Sipariş tarihi",
  billedTo: "Müşteri", issuer: "Düzenleyen", issuerPending: "Şirket bilgileri henüz girilmedi",
  description: "Açıklama", quantity: "Adet", unitPrice: "Birim fiyat", taxRate: "KDV %", net: "Net", tax: "KDV", total: "Toplam",
  subtotal: "Ara toplam", discount: "İndirim", grandTotal: "Genel toplam", taxPending: "Vergi oranı henüz tanımlanmadı",
  refundReference: "İade referansı", originalInvoice: "İlgili fatura", refundReason: "İade nedeni", refundTotal: "İade tutarı",
  guideIntro: "eSIM'inizi seyahatten önce, internet bağlantınız varken kurun.",
  guideStep1: "Telefonunuzun eSIM destekleyip desteklemediğini ve operatör kilidi olmadığını kontrol edin.",
  guideStep2: "pasaport.io hesabınıza giriş yapın ve Hesabım > eSIM'lerim bölümünü açın.",
  guideStep3: "Kurulum ekranındaki QR kodu tarayın veya bilgileri elle girin.",
  guideStep4: "Yeni hattı veri hattı olarak seçin ve dolaşımı (roaming) açın.",
  guideStep5: "Varış ülkesinde eSIM hattını açın; ana hattınızı istediğiniz gibi kullanmaya devam edin.",
  guideSecurity: "Güvenliğiniz için QR kodu ve aktivasyon bilgileri bu belgede yer almaz; yalnız hesabınızda görünür.",
  footer: "pasaport.io · Seyahat eSIM'leri", page: "Sayfa",
};

const de: DocumentLabels = {
  "title.invoice": "Rechnung", "title.order-summary": "Bestellübersicht", "title.credit-note": "Gutschrift / Erstattung", "title.esim-guide": "eSIM-Installationsanleitung",
  sampleWatermark: "MUSTER", notValidInvoice: "Musterdokument — keine gültige Rechnung.", notTaxDocument: "Dieses Dokument ist kein Steuerbeleg.",
  documentNumber: "Belegnummer", numberPending: "Wird bei Ausstellung vergeben", issueDate: "Ausstellungsdatum", orderNumber: "Bestellnummer", orderDate: "Bestelldatum",
  billedTo: "Kunde", issuer: "Aussteller", issuerPending: "Unternehmensdaten noch nicht hinterlegt",
  description: "Beschreibung", quantity: "Menge", unitPrice: "Einzelpreis", taxRate: "USt. %", net: "Netto", tax: "USt.", total: "Gesamt",
  subtotal: "Zwischensumme", discount: "Rabatt", grandTotal: "Gesamtbetrag", taxPending: "Steuersatz noch nicht festgelegt",
  refundReference: "Erstattungsreferenz", originalInvoice: "Ursprüngliche Rechnung", refundReason: "Erstattungsgrund", refundTotal: "Erstattungsbetrag",
  guideIntro: "Installieren Sie Ihre eSIM vor der Reise, solange Sie Internet haben.",
  guideStep1: "Prüfen Sie, ob Ihr Telefon eSIM unterstützt und keine Netzsperre hat.",
  guideStep2: "Melden Sie sich bei pasaport.io an und öffnen Sie Mein Konto > Meine eSIMs.",
  guideStep3: "Scannen Sie den QR-Code auf der Installationsseite oder geben Sie die Daten manuell ein.",
  guideStep4: "Wählen Sie die neue Leitung für mobile Daten und aktivieren Sie Roaming.",
  guideStep5: "Schalten Sie die eSIM im Zielland ein; Ihre Hauptnummer bleibt nutzbar.",
  guideSecurity: "Zu Ihrer Sicherheit enthält dieses Dokument keinen QR-Code und keine Aktivierungsdaten; diese sehen Sie nur in Ihrem Konto.",
  footer: "pasaport.io · Reise-eSIMs", page: "Seite",
};

const en: DocumentLabels = {
  "title.invoice": "Invoice", "title.order-summary": "Order summary", "title.credit-note": "Refund / credit note", "title.esim-guide": "eSIM installation guide",
  sampleWatermark: "SAMPLE", notValidInvoice: "Sample document — not a valid invoice.", notTaxDocument: "This document is not a tax document.",
  documentNumber: "Document no", numberPending: "Assigned when issued", issueDate: "Issue date", orderNumber: "Order no", orderDate: "Order date",
  billedTo: "Customer", issuer: "Issued by", issuerPending: "Company details not entered yet",
  description: "Description", quantity: "Qty", unitPrice: "Unit price", taxRate: "VAT %", net: "Net", tax: "VAT", total: "Total",
  subtotal: "Subtotal", discount: "Discount", grandTotal: "Grand total", taxPending: "Tax rate not defined yet",
  refundReference: "Refund reference", originalInvoice: "Original invoice", refundReason: "Refund reason", refundTotal: "Refund amount",
  guideIntro: "Install your eSIM before you travel, while you have an internet connection.",
  guideStep1: "Check that your phone supports eSIM and is not carrier-locked.",
  guideStep2: "Sign in to pasaport.io and open My account > My eSIMs.",
  guideStep3: "Scan the QR code on the installation screen or enter the details manually.",
  guideStep4: "Select the new line for mobile data and turn on roaming.",
  guideStep5: "Switch the eSIM on in your destination; your main number keeps working.",
  guideSecurity: "For your security, this document contains no QR code or activation data; you only see them in your account.",
  footer: "pasaport.io · Travel eSIMs", page: "Page",
};

/** Arabic draft (review required) — included to exercise right-to-left layout. */
const ar: DocumentLabels = {
  "title.invoice": "فاتورة", "title.order-summary": "ملخص الطلب", "title.credit-note": "إشعار دائن / استرداد", "title.esim-guide": "دليل تثبيت eSIM",
  sampleWatermark: "نموذج", notValidInvoice: "مستند نموذجي، ليست فاتورة صالحة.", notTaxDocument: "هذا المستند ليس مستندًا ضريبيًا.",
  documentNumber: "رقم المستند", numberPending: "يُحدد عند الإصدار", issueDate: "تاريخ الإصدار", orderNumber: "رقم الطلب", orderDate: "تاريخ الطلب",
  billedTo: "العميل", issuer: "المُصدِر", issuerPending: "لم تُدخل بيانات الشركة بعد",
  description: "الوصف", quantity: "الكمية", unitPrice: "سعر الوحدة", taxRate: "الضريبة %", net: "الصافي", tax: "الضريبة", total: "الإجمالي",
  subtotal: "المجموع الفرعي", discount: "الخصم", grandTotal: "الإجمالي الكلي", taxPending: "لم يُحدد معدل الضريبة بعد",
  refundReference: "مرجع الاسترداد", originalInvoice: "الفاتورة الأصلية", refundReason: "سبب الاسترداد", refundTotal: "مبلغ الاسترداد",
  guideIntro: "ثبّت eSIM قبل السفر أثناء اتصالك بالإنترنت.",
  guideStep1: "تأكد من أن هاتفك يدعم eSIM وغير مقفل على مشغل.",
  guideStep2: "سجّل الدخول إلى pasaport.io وافتح حسابي > شرائح eSIM.",
  guideStep3: "امسح رمز QR في شاشة التثبيت أو أدخل البيانات يدويًا.",
  guideStep4: "اختر الخط الجديد لبيانات الجوال وفعّل التجوال.",
  guideStep5: "فعّل eSIM في بلد الوصول؛ يبقى رقمك الأساسي متاحًا.",
  guideSecurity: "حفاظًا على أمانك لا يحتوي هذا المستند على رمز QR أو بيانات التفعيل؛ تظهر فقط في حسابك.",
  footer: "pasaport.io · شرائح eSIM للسفر", page: "صفحة",
};

export const SEED_LABELS: Partial<Record<DocumentLocale, DocumentLabels>> = { tr, de, en, ar };
export const DRAFT_LOCALES: readonly DocumentLocale[] = ["ar"];

/** Requested → English when the language has no labels or its script cannot be drawn yet. */
export function resolveDocumentLocale(
  locale: DocumentLocale,
  labels: Partial<Record<DocumentLocale, DocumentLabels>> = SEED_LABELS,
): { locale: DocumentLocale; fallback: boolean; reason: "none" | "no-labels" | "script" } {
  if (!RENDERABLE_LOCALES.includes(locale)) return { locale: "en", fallback: true, reason: "script" };
  if (!labels[locale]) return { locale: "en", fallback: true, reason: "no-labels" };
  return { locale, fallback: false, reason: "none" };
}

/** Allowlisted renderer input. Never add supplier cost, tokens, QR or activation fields. */
export type DocumentLine = { description: string; quantity: number; unitGrossCents: number; taxRatePercent: number | null };
export type DocumentData = {
  sample: boolean;
  documentNumber: string | null;
  issueDate: string;
  currency: string;
  order: { number: string; date: string };
  customer: { name: string; email: string; country: string };
  issuer: { name: string; address: string; taxId: string } | null;
  lines: DocumentLine[];
  discountCents: number;
  refund: { reference: string; originalInvoiceNumber: string | null; reason: string; amountCents: number } | null;
};

export const ALLOWED_DATA_KEYS = ["sample", "documentNumber", "issueDate", "currency", "order", "customer", "issuer", "lines", "discountCents", "refund"] as const;

/** Synthetic sample — clearly fictional, never a real customer or company. */
export function sampleData(kind: DocumentKind): DocumentData {
  return {
    sample: true,
    documentNumber: null,
    issueDate: "2026-10-12",
    currency: "EUR",
    order: { number: "PSP-ORNEK-0001", date: "2026-10-12" },
    customer: { name: "Deniz Örnek", email: "ornek@example.invalid", country: "DE" },
    issuer: null,
    lines: kind === "esim-guide" ? [] : [
      { description: "Almanya eSIM · 10 GB · 30 gün", quantity: 1, unitGrossCents: 1990, taxRatePercent: null },
      { description: "Avrupa eSIM · 5 GB · 15 gün", quantity: 2, unitGrossCents: 990, taxRatePercent: null },
    ],
    discountCents: kind === "order-summary" ? 300 : 0,
    refund: kind === "credit-note" ? { reference: "RF-ORNEK-0001", originalInvoiceNumber: null, reason: "eSIM kullanılmadı (14 gün)", amountCents: 1990 } : null,
  };
}
