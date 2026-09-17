import type { Locale } from "@/domain/enums";

/** Payment status and fulfillment status are deliberately separate domains. */
export type CustomerPaymentState = "PAYMENT_PENDING" | "PAYMENT_CONFIRMED" | "PAYMENT_FAILED" | "REFUNDED";
export type CustomerFulfillmentState = "FULFILLMENT_PROCESSING" | "READY" | "DELIVERY_EMAIL_FAILED" | "FULFILLMENT_FAILED";
export type DeliveryEmailState = "NOT_SENT" | "QUEUED" | "SENT" | "FAILED";

/** Analytics contracts — payloads must never carry QR/activation content. */
export type FulfillmentEventName =
  | "fulfillment_ready"
  | "qr_viewed"
  | "voucher_viewed"
  | "delivery_email_sent"
  | "delivery_email_failed"
  | "delivery_email_resent";
export type FulfillmentEvent = { name: FulfillmentEventName; orderItemId: string; serviceType: "ESIM" | "LOUNGE"; occurredAt: string };

/** Sensitive fulfillment payload. Only ever loaded for the authorized customer/order. */
export type EsimActivation = {
  qrImageUrl?: string;
  activationCode?: string;
  smdpAddress?: string;
  manualInstructions?: string;
};

export type EsimFulfillment = {
  kind: "ESIM";
  id: string;
  destinationLabel: string;
  flag: string;
  packageLabel: string;
  payment: CustomerPaymentState;
  fulfillment: CustomerFulfillmentState;
  deliveryEmail: string;
  deliveryEmailState: DeliveryEmailState;
  totalData?: string;
  remainingData?: string;
  expiresOn?: string;
  iccid?: string;
  activation?: EsimActivation;
};

export type LoungeFulfillment = {
  kind: "LOUNGE";
  id: string;
  flag: string;
  iata: string;
  airportLabel: string;
  terminal?: string;
  loungeName: string;
  visitAt: string;
  travelers: number;
  bookingReference?: string;
  payment: CustomerPaymentState;
  fulfillment: CustomerFulfillmentState;
  deliveryEmail: string;
  deliveryEmailState: DeliveryEmailState;
  entryCode?: string;
};

export type TripService = EsimFulfillment | LoungeFulfillment;

export type CustomerTrip = {
  id: string;
  title: string;
  dateLabel: string;
  isMock?: boolean;
  services: TripService[];
};

export const FULFILLMENT_COPY: Record<
  Locale,
  {
    payment: Record<CustomerPaymentState, string>;
    fulfillment: Record<CustomerFulfillmentState, string>;
    email: Record<DeliveryEmailState, string>;
    paymentLabel: string;
    deliveryLabel: string;
    showQr: string;
    showEntryCode: string;
    installGuide: string;
    resendEmail: string;
    buyAgain: string;
    support: string;
    qrTitle: string;
    qrHint: string;
    voucherTitle: string;
    emailFailedHint: string;
    processingHint: string;
    mockNotice: string;
    deliveryEmailLabel: string;
    deliveryEmailHelp: string;
  }
> = {
  tr: {
    payment: { PAYMENT_PENDING: "Ödeme bekleniyor", PAYMENT_CONFIRMED: "Ödeme alındı", PAYMENT_FAILED: "Ödeme tamamlanmadı", REFUNDED: "İade edildi" },
    fulfillment: { FULFILLMENT_PROCESSING: "Hazırlanıyor", READY: "Hazır", DELIVERY_EMAIL_FAILED: "Hazır · e-posta gönderilemedi", FULFILLMENT_FAILED: "Destek gerekiyor" },
    email: { NOT_SENT: "Henüz gönderilmedi", QUEUED: "Gönderiliyor", SENT: "E-posta gönderildi", FAILED: "E-posta gönderilemedi" },
    paymentLabel: "Ödeme", deliveryLabel: "Teslimat",
    showQr: "QR kodunu göster", showEntryCode: "Giriş kodunu göster", installGuide: "Kurulum rehberi", resendEmail: "E-postaya tekrar gönder", buyAgain: "Tekrar satın al", support: "Destek al",
    qrTitle: "eSIM’in hazır", qrHint: "QR kodu yalnızca sana özeldir; paylaşma.",
    voucherTitle: "Rezervasyon hazır",
    emailFailedHint: "E-posta ulaşmadıysa hizmetin burada erişilebilir durumda kalır.",
    processingHint: "Hizmetin hazırlanıyor. Hazır olduğunda burada görünecek.",
    mockNotice: "Örnek görünüm · üretim verisi değildir",
    deliveryEmailLabel: "Teslimat e-postası",
    deliveryEmailHelp: "eSIM / Lounge teslimat bilgilerin bu adrese gönderilecek.",
  },
  de: {
    payment: { PAYMENT_PENDING: "Zahlung ausstehend", PAYMENT_CONFIRMED: "Zahlung erhalten", PAYMENT_FAILED: "Zahlung fehlgeschlagen", REFUNDED: "Erstattet" },
    fulfillment: { FULFILLMENT_PROCESSING: "Wird vorbereitet", READY: "Bereit", DELIVERY_EMAIL_FAILED: "Bereit · E-Mail fehlgeschlagen", FULFILLMENT_FAILED: "Support erforderlich" },
    email: { NOT_SENT: "Noch nicht gesendet", QUEUED: "Wird gesendet", SENT: "E-Mail gesendet", FAILED: "E-Mail fehlgeschlagen" },
    paymentLabel: "Zahlung", deliveryLabel: "Zustellung",
    showQr: "QR-Code anzeigen", showEntryCode: "Zutrittscode anzeigen", installGuide: "Installationsanleitung", resendEmail: "E-Mail erneut senden", buyAgain: "Erneut kaufen", support: "Hilfe erhalten",
    qrTitle: "Deine eSIM ist bereit", qrHint: "Der QR-Code gilt nur für dich – bitte nicht teilen.",
    voucherTitle: "Buchung bereit",
    emailFailedHint: "Auch ohne E-Mail bleibt dein Service hier verfügbar.",
    processingHint: "Dein Service wird vorbereitet und erscheint hier, sobald er bereit ist.",
    mockNotice: "Beispielansicht · keine Produktionsdaten",
    deliveryEmailLabel: "Zustell-E-Mail",
    deliveryEmailHelp: "Deine eSIM-/Lounge-Zustellinfos gehen an diese Adresse.",
  },
  en: {
    payment: { PAYMENT_PENDING: "Payment pending", PAYMENT_CONFIRMED: "Payment received", PAYMENT_FAILED: "Payment failed", REFUNDED: "Refunded" },
    fulfillment: { FULFILLMENT_PROCESSING: "Preparing", READY: "Ready", DELIVERY_EMAIL_FAILED: "Ready · email failed", FULFILLMENT_FAILED: "Support needed" },
    email: { NOT_SENT: "Not sent yet", QUEUED: "Sending", SENT: "Email sent", FAILED: "Email failed" },
    paymentLabel: "Payment", deliveryLabel: "Delivery",
    showQr: "Show QR code", showEntryCode: "Show entry code", installGuide: "Installation guide", resendEmail: "Resend email", buyAgain: "Buy again", support: "Get support",
    qrTitle: "Your eSIM is ready", qrHint: "This QR code is personal to you — do not share it.",
    voucherTitle: "Booking ready",
    emailFailedHint: "If the email never arrives, your service stays available here.",
    processingHint: "Your service is being prepared and will appear here once ready.",
    mockNotice: "Example view · not production data",
    deliveryEmailLabel: "Delivery email",
    deliveryEmailHelp: "Your eSIM / Lounge delivery details go to this address.",
  },
};
