import { localize } from "@/i18n/overlay";
import { siApplepay, siGooglepay, siPaypal, siVisa } from "simple-icons";
import { useI18n } from "@/i18n";

const COPY = localize({
  tr: { methods: "Ödeme seçenekleri" },
  de: { methods: "Zahlungsarten" },
  en: { methods: "Payment options" },
  ar: { methods: "خيارات الدفع" },
} as const);

type Icon = { path: string; hex: string; title: string };
const Svg = ({ icon, width, color }: { icon: Icon; width: number; color?: string }) => (
  <svg role="img" aria-label={icon.title} viewBox="0 0 24 24" width={width} height={width} fill={color ?? `#${icon.hex}`}><path d={icon.path} /></svg>
);

function Logos() {
  return (
    <ul className="pay-logos" dir="ltr">
      <li data-pay="klarna"><span className="pay-klarna" aria-label="Klarna">Klarna.</span></li>
      <li data-pay="paypal"><span className="pay-paypal" aria-label="PayPal"><Svg icon={siPaypal} width={16} /><b aria-hidden="true">Pay</b><i aria-hidden="true">Pal</i></span></li>
      <li data-pay="googlepay"><Svg icon={siGooglepay} width={50} color="#3C4043" /></li>
      <li data-pay="applepay"><Svg icon={siApplepay} width={48} /></li>
      <li data-pay="visa"><Svg icon={siVisa} width={48} /></li>
    </ul>
  );
}

/** Storefront payment marks. Display only — does not enable checkout providers. */
export function PaymentStrip({ preview: _preview = false }: { preview?: boolean }) {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale as keyof typeof COPY] ?? COPY.en;
  return (
    <div className="pay-strip pay-strip-glass" data-payment-strip aria-label={c.methods}>
      <Logos />
    </div>
  );
}
