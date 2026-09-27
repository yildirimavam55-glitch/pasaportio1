import { localize } from "@/i18n/overlay";

export const PROMO_COPY = localize({
  tr: {
    copied: "Kod kopyalandı", copy: "Kodu kopyala", close: "Kapat", copyFailed: "Kopyalanamadı",
    toggle: "İndirim kodun var mı?", placeholder: "Kupon kodu", apply: "Uygula", applying: "Kontrol ediliyor…",
    applied: "uygulandı", remove: "Kuponu kaldır", subtotal: "Ara toplam", discount: "İndirim", total: "Toplam",
    partial: "İndirim yalnızca kampanyaya uygun ürünlere uygulandı.",
    errors: {
      INVALID: "Bu kod geçerli değil.", PAUSED: "Bu kampanya şu anda aktif değil.", NOT_STARTED: "Bu kampanya henüz başlamadı.",
      EXPIRED: "Bu kampanyanın süresi doldu.", TOTAL_LIMIT: "Bu kodun kullanım limiti doldu.", CUSTOMER_LIMIT: "Bu kodu zaten kullandın.",
      LOGIN_REQUIRED: "Bu kodu kullanmak için giriş yapmalısın.", MIN_ORDER: "Bu kod için minimum sepet tutarı: {min}.",
      NO_ELIGIBLE: "Sepetinde bu koda uygun ürün yok.", NETWORK: "Kod şu anda kontrol edilemedi. Lütfen tekrar dene.",
    },
  },
  de: {
    copied: "Code kopiert", copy: "Code kopieren", close: "Schließen", copyFailed: "Kopieren fehlgeschlagen",
    toggle: "Hast du einen Rabattcode?", placeholder: "Gutscheincode", apply: "Einlösen", applying: "Wird geprüft…",
    applied: "angewendet", remove: "Gutschein entfernen", subtotal: "Zwischensumme", discount: "Rabatt", total: "Gesamt",
    partial: "Der Rabatt gilt nur für berechtigte Produkte.",
    errors: {
      INVALID: "Dieser Code ist ungültig.", PAUSED: "Diese Aktion ist derzeit nicht aktiv.", NOT_STARTED: "Diese Aktion hat noch nicht begonnen.",
      EXPIRED: "Diese Aktion ist abgelaufen.", TOTAL_LIMIT: "Dieser Code wurde bereits zu oft eingelöst.", CUSTOMER_LIMIT: "Du hast diesen Code bereits genutzt.",
      LOGIN_REQUIRED: "Bitte melde dich an, um diesen Code zu nutzen.", MIN_ORDER: "Mindestbestellwert für diesen Code: {min}.",
      NO_ELIGIBLE: "Keine Produkte in deinem Warenkorb sind für diesen Code berechtigt.", NETWORK: "Der Code konnte gerade nicht geprüft werden. Bitte versuche es erneut.",
    },
  },
  en: {
    copied: "Code copied", copy: "Copy code", close: "Close", copyFailed: "Could not copy",
    toggle: "Have a discount code?", placeholder: "Coupon code", apply: "Apply", applying: "Checking…",
    applied: "applied", remove: "Remove coupon", subtotal: "Subtotal", discount: "Discount", total: "Total",
    partial: "The discount applies to eligible products only.",
    errors: {
      INVALID: "This code is not valid.", PAUSED: "This promotion is not active right now.", NOT_STARTED: "This promotion hasn't started yet.",
      EXPIRED: "This promotion has ended.", TOTAL_LIMIT: "This code has reached its usage limit.", CUSTOMER_LIMIT: "You've already used this code.",
      LOGIN_REQUIRED: "Please sign in to use this code.", MIN_ORDER: "Minimum cart value for this code: {min}.",
      NO_ELIGIBLE: "No products in your cart qualify for this code.", NETWORK: "We couldn't check the code right now. Please try again.",
    },
  },
});

/** WebView-safe copy: async Clipboard API first, then a hidden-textarea fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px;";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
