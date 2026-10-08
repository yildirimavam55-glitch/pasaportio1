import { Lock, ShieldCheck } from "lucide-react";
import { siApplepay, siGooglepay, siPaypal, siVisa } from "simple-icons";
import { useI18n } from "@/i18n";

const COPY = {
  tr: { payment: "Güvenli ödeme", checkout: "Güvenli ödeme adımı", stripe: "Stripe altyapısıyla", note: "Örnek ödeme yöntemleri · Tasarım önizlemesi" },
  de: { payment: "Sichere Zahlung", checkout: "Sicherer Checkout", stripe: "Powered by Stripe", note: "Beispielhafte Zahlungsarten · Designvorschau" },
  en: { payment: "Secure payment", checkout: "Secure checkout", stripe: "Powered by Stripe", note: "Illustrative payment methods · Design preview" },
  ar: { payment: "دفع آمن", checkout: "إتمام شراء آمن", stripe: "مدعوم من Stripe", note: "طرق دفع توضيحية · معاينة التصميم" },
} as const;

type Icon = { path: string; hex: string; title: string };
const Svg = ({ icon, width, color }: { icon: Icon; width: number; color?: string }) => (
  <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" width={width} height={width} fill={color ?? `#${icon.hex}`}><path d={icon.path} /></svg>
);

/** Brand marks in the requested order; Stripe is the processor, never a method logo. */
function Logos() {
  return (
    <ul className="pay-logos" dir="ltr">
      <li><span className="pay-klarna" aria-label="Klarna">Klarna.</span></li>
      <li><span className="pay-paypal" aria-label="PayPal"><Svg icon={siPaypal} width={16} /><b aria-hidden="true">Pay</b><i aria-hidden="true">Pal</i></span></li>
      <li><Svg icon={siVisa} width={48} /></li>
      <li><Svg icon={siApplepay} width={48} /></li>
      <li><Svg icon={siGooglepay} width={50} color="#3C4043" /></li>
    </ul>
  );
}

/**
 * Payment-method strip below the family photo. No payment provider is configured yet, so public
 * pages render nothing; the design preview shows the requested set labelled as illustrative.
 */
export function PaymentStrip({ preview }: { preview: boolean }) {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale as keyof typeof COPY] ?? COPY.en;
  if (!preview) return null;
  return (
    <div className="pay-strip" data-payment-strip>
      <div className="pay-head">
        <span className="pay-shield"><ShieldCheck aria-hidden="true" /></span>
        <Lock className="pay-lock" aria-hidden="true" />
        <div><strong className="pay-title-m">{c.payment}</strong><strong className="pay-title-d">{c.checkout}</strong><small className="pay-stripe-d">{c.stripe}</small></div>
      </div>
      <Logos />
      <small className="pay-stripe-m">{c.stripe}</small>
      <small className="pay-note">{c.note}</small>
    </div>
  );
}
