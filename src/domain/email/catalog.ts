/**
 * Portable e-mail template catalogue: the nine transactional e-mails, the variables each one
 * may use, and the code-side starter copy (TR/DE/EN). This file is the seed backup — the
 * database copy is editable from Admin → E-postalar, and a fresh server can be re-seeded from here.
 *
 * Security rules baked into the catalogue:
 * - Only allowlisted {{variables}} are accepted per template (see TEMPLATE_VARIABLES).
 * - Verification / reset links are runtime-only values ({{verifyUrl}}, {{resetUrl}}); no token is
 *   ever stored in a template.
 * - eSIM delivery never contains QR or activation data — it only links to the signed-in account.
 */

export const EMAIL_TEMPLATE_KEYS = [
  "welcome",
  "email-verification",
  "password-reset",
  "order-confirmation",
  "esim-delivery",
  "payment-failed",
  "refund-approved",
  "support-notification",
  "account-deletion",
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export const EMAIL_LOCALES = ["tr", "en", "de", "fr", "es", "it", "pt", "nl", "pl", "ar", "ru", "ja", "ko", "zh"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
/** Locales whose copy must be complete; every other locale falls back to English. */
export const COMPLETE_LOCALES: readonly EmailLocale[] = ["tr", "de", "en"];
export const FALLBACK_LOCALE: EmailLocale = "en";
export const RTL_LOCALES: readonly EmailLocale[] = ["ar"];

export type TemplateCopy = { subject: string; preheader: string; body: string };

/** Variables always available. */
export const COMMON_VARIABLES = ["siteName", "supportUrl", "accountUrl"] as const;

export const TEMPLATE_VARIABLES: Record<EmailTemplateKey, readonly string[]> = {
  welcome: ["customerName"],
  "email-verification": ["customerName", "verifyUrl", "expiresInHours"],
  "password-reset": ["customerName", "resetUrl", "expiresInMinutes"],
  "order-confirmation": ["customerName", "orderNumber", "orderDate", "productName", "orderTotal", "orderUrl"],
  "esim-delivery": ["customerName", "orderNumber", "productName", "esimUrl"],
  "payment-failed": ["customerName", "orderNumber", "orderTotal", "retryUrl"],
  "refund-approved": ["customerName", "orderNumber", "refundAmount", "refundDays"],
  "support-notification": ["customerName", "ticketNumber", "ticketSubject", "ticketUrl"],
  "account-deletion": ["customerName", "deletionDate"],
};

/** The variable a [[button:...]] line links to. Always a server-built URL. */
export const TEMPLATE_ACTION: Record<EmailTemplateKey, string> = {
  welcome: "accountUrl",
  "email-verification": "verifyUrl",
  "password-reset": "resetUrl",
  "order-confirmation": "orderUrl",
  "esim-delivery": "esimUrl",
  "payment-failed": "retryUrl",
  "refund-approved": "accountUrl",
  "support-notification": "ticketUrl",
  "account-deletion": "supportUrl",
};

export const TEMPLATE_META: Record<EmailTemplateKey, { name: string; description: string }> = {
  welcome: { name: "Hoş geldiniz", description: "Hesap oluşturulduktan sonra." },
  "email-verification": { name: "E-posta doğrulama", description: "Yeni hesabın e-posta adresini doğrular." },
  "password-reset": { name: "Şifre sıfırlama", description: "Müşteri şifre sıfırlama istediğinde." },
  "order-confirmation": { name: "Sipariş onayı", description: "Ödeme onaylandıktan sonra." },
  "esim-delivery": { name: "eSIM teslimatı", description: "eSIM hazır olduğunda; QR yalnız hesapta." },
  "payment-failed": { name: "Ödeme başarısız", description: "Ödeme reddedildiğinde." },
  "refund-approved": { name: "İade onayı", description: "İade talebi onaylandığında." },
  "support-notification": { name: "Destek bildirimi", description: "Destek talebine yanıt geldiğinde." },
  "account-deletion": { name: "Hesap silme onayı", description: "Hesap silme işlemi tamamlandığında." },
};

export function allowedVariables(key: EmailTemplateKey): string[] {
  return [...COMMON_VARIABLES, ...TEMPLATE_VARIABLES[key]];
}

/** Synthetic preview data only — never real customers. */
export const PREVIEW_DATA: Record<string, string> = {
  siteName: "pasaport.io",
  supportUrl: "https://pasaport.io/destek",
  accountUrl: "https://pasaport.io/account",
  customerName: "Deniz Örnek",
  verifyUrl: "https://pasaport.io/onizleme/dogrulama",
  expiresInHours: "24",
  resetUrl: "https://pasaport.io/onizleme/sifre",
  expiresInMinutes: "60",
  orderNumber: "PSP-ORNEK-0001",
  orderDate: "12.10.2026",
  productName: "Almanya eSIM · 10 GB · 30 gün",
  orderTotal: "19,90 EUR",
  orderUrl: "https://pasaport.io/account/orders",
  esimUrl: "https://pasaport.io/account/esims",
  retryUrl: "https://pasaport.io/sepet",
  refundAmount: "19,90 EUR",
  refundDays: "5–10",
  ticketNumber: "DST-ORNEK-42",
  ticketSubject: "Kurulum sorusu",
  ticketUrl: "https://pasaport.io/account/support",
  deletionDate: "12.10.2026",
};

type Seed = Record<EmailTemplateKey, Record<"tr" | "de" | "en", TemplateCopy>>;

export const SEED_TEMPLATES: Seed = {
  welcome: {
    tr: { subject: "{{siteName}}'ya hoş geldiniz", preheader: "Hesabınız hazır.", body: "# Hoş geldiniz, {{customerName}}\n\nHesabınız oluşturuldu. Seyahatleriniz için eSIM paketlerini artık tek yerden yönetebilirsiniz.\n\n[[button:Hesabıma git]]\n\nSorularınız için destek ekibimiz her zaman yanınızda." },
    de: { subject: "Willkommen bei {{siteName}}", preheader: "Ihr Konto ist bereit.", body: "# Willkommen, {{customerName}}\n\nIhr Konto wurde erstellt. Sie können Ihre eSIM-Pakete für Reisen jetzt an einem Ort verwalten.\n\n[[button:Zu meinem Konto]]\n\nBei Fragen ist unser Support-Team für Sie da." },
    en: { subject: "Welcome to {{siteName}}", preheader: "Your account is ready.", body: "# Welcome, {{customerName}}\n\nYour account has been created. You can now manage your travel eSIM packages in one place.\n\n[[button:Go to my account]]\n\nOur support team is always here if you have questions." },
  },
  "email-verification": {
    tr: { subject: "E-posta adresinizi doğrulayın", preheader: "Hesabınızı etkinleştirmek için bir adım kaldı.", body: "# E-posta adresinizi doğrulayın\n\nMerhaba {{customerName}}, hesabınızı etkinleştirmek için aşağıdaki düğmeye tıklayın.\n\n[[button:E-postamı doğrula]]\n\nBağlantı {{expiresInHours}} saat geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz." },
    de: { subject: "Bestätigen Sie Ihre E-Mail-Adresse", preheader: "Nur noch ein Schritt bis zur Aktivierung.", body: "# Bestätigen Sie Ihre E-Mail-Adresse\n\nHallo {{customerName}}, klicken Sie auf die Schaltfläche, um Ihr Konto zu aktivieren.\n\n[[button:E-Mail bestätigen]]\n\nDer Link ist {{expiresInHours}} Stunden gültig. Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail." },
    en: { subject: "Verify your email address", preheader: "One step left to activate your account.", body: "# Verify your email address\n\nHi {{customerName}}, click the button below to activate your account.\n\n[[button:Verify my email]]\n\nThe link is valid for {{expiresInHours}} hours. If you didn't request this, you can ignore this email." },
  },
  "password-reset": {
    tr: { subject: "Şifre sıfırlama isteğiniz", preheader: "Yeni şifrenizi belirleyin.", body: "# Şifrenizi sıfırlayın\n\nMerhaba {{customerName}}, hesabınız için şifre sıfırlama isteği aldık.\n\n[[button:Yeni şifre belirle]]\n\nBağlantı {{expiresInMinutes}} dakika geçerlidir. Bu isteği siz yapmadıysanız şifreniz değişmez; bu e-postayı yok sayabilirsiniz." },
    de: { subject: "Ihre Anfrage zum Zurücksetzen des Passworts", preheader: "Legen Sie ein neues Passwort fest.", body: "# Passwort zurücksetzen\n\nHallo {{customerName}}, wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.\n\n[[button:Neues Passwort festlegen]]\n\nDer Link ist {{expiresInMinutes}} Minuten gültig. Wenn Sie dies nicht angefordert haben, bleibt Ihr Passwort unverändert." },
    en: { subject: "Your password reset request", preheader: "Set a new password.", body: "# Reset your password\n\nHi {{customerName}}, we received a request to reset your password.\n\n[[button:Set a new password]]\n\nThe link is valid for {{expiresInMinutes}} minutes. If you didn't request this, your password stays unchanged." },
  },
  "order-confirmation": {
    tr: { subject: "Siparişiniz onaylandı · {{orderNumber}}", preheader: "{{productName}} siparişiniz alındı.", body: "# Teşekkürler, {{customerName}}\n\nSiparişiniz onaylandı.\n\nSipariş no: {{orderNumber}}\nTarih: {{orderDate}}\nÜrün: {{productName}}\nToplam: {{orderTotal}}\n\neSIM'iniz hazır olduğunda ayrıca bilgilendirileceksiniz.\n\n[[button:Siparişi görüntüle]]" },
    de: { subject: "Ihre Bestellung ist bestätigt · {{orderNumber}}", preheader: "Ihre Bestellung {{productName}} ist eingegangen.", body: "# Vielen Dank, {{customerName}}\n\nIhre Bestellung ist bestätigt.\n\nBestellnummer: {{orderNumber}}\nDatum: {{orderDate}}\nProdukt: {{productName}}\nGesamt: {{orderTotal}}\n\nSobald Ihre eSIM bereit ist, informieren wir Sie separat.\n\n[[button:Bestellung ansehen]]" },
    en: { subject: "Your order is confirmed · {{orderNumber}}", preheader: "We received your {{productName}} order.", body: "# Thank you, {{customerName}}\n\nYour order is confirmed.\n\nOrder no: {{orderNumber}}\nDate: {{orderDate}}\nProduct: {{productName}}\nTotal: {{orderTotal}}\n\nWe'll let you know separately when your eSIM is ready.\n\n[[button:View order]]" },
  },
  "esim-delivery": {
    tr: { subject: "eSIM'iniz hazır · {{orderNumber}}", preheader: "Kurulum bilgileri hesabınızda.", body: "# eSIM'iniz hazır\n\nMerhaba {{customerName}}, {{productName}} eSIM'iniz kuruluma hazır.\n\nGüvenliğiniz için QR kodu ve kurulum bilgileri e-postayla gönderilmez. Hesabınıza giriş yaparak görüntüleyebilirsiniz.\n\n[[button:eSIM'imi kur]]" },
    de: { subject: "Ihre eSIM ist bereit · {{orderNumber}}", preheader: "Die Installationsdaten finden Sie in Ihrem Konto.", body: "# Ihre eSIM ist bereit\n\nHallo {{customerName}}, Ihre eSIM {{productName}} kann installiert werden.\n\nZu Ihrer Sicherheit senden wir QR-Code und Installationsdaten nicht per E-Mail. Sie finden sie nach der Anmeldung in Ihrem Konto.\n\n[[button:eSIM installieren]]" },
    en: { subject: "Your eSIM is ready · {{orderNumber}}", preheader: "Installation details are in your account.", body: "# Your eSIM is ready\n\nHi {{customerName}}, your {{productName}} eSIM is ready to install.\n\nFor your security, the QR code and installation details are never sent by email. Sign in to your account to view them.\n\n[[button:Install my eSIM]]" },
  },
  "payment-failed": {
    tr: { subject: "Ödemeniz tamamlanamadı · {{orderNumber}}", preheader: "Siparişiniz için ödemeyi tekrar deneyin.", body: "# Ödeme tamamlanamadı\n\nMerhaba {{customerName}}, {{orderNumber}} numaralı siparişiniz için {{orderTotal}} tutarındaki ödeme alınamadı. Hesabınızdan ücret çekilmedi.\n\n[[button:Ödemeyi tekrar dene]]\n\nSorun devam ederse destek ekibimizle iletişime geçin." },
    de: { subject: "Ihre Zahlung konnte nicht abgeschlossen werden · {{orderNumber}}", preheader: "Versuchen Sie die Zahlung erneut.", body: "# Zahlung fehlgeschlagen\n\nHallo {{customerName}}, die Zahlung über {{orderTotal}} für Bestellung {{orderNumber}} ist fehlgeschlagen. Es wurde nichts abgebucht.\n\n[[button:Zahlung erneut versuchen]]\n\nWenn das Problem weiterhin besteht, kontaktieren Sie unseren Support." },
    en: { subject: "Your payment could not be completed · {{orderNumber}}", preheader: "Please try the payment again.", body: "# Payment failed\n\nHi {{customerName}}, the {{orderTotal}} payment for order {{orderNumber}} did not go through. You have not been charged.\n\n[[button:Try payment again]]\n\nIf the problem continues, please contact our support team." },
  },
  "refund-approved": {
    tr: { subject: "İade talebiniz onaylandı · {{orderNumber}}", preheader: "{{refundAmount}} iadeniz işleme alındı.", body: "# İadeniz onaylandı\n\nMerhaba {{customerName}}, {{orderNumber}} numaralı sipariş için iade talebiniz onaylandı.\n\nİade tutarı: {{refundAmount}}\n\nTutar, ödeme yönteminize {{refundDays}} iş günü içinde yansır.\n\n[[button:Hesabıma git]]" },
    de: { subject: "Ihre Rückerstattung wurde genehmigt · {{orderNumber}}", preheader: "Ihre Rückerstattung über {{refundAmount}} wird bearbeitet.", body: "# Rückerstattung genehmigt\n\nHallo {{customerName}}, Ihr Erstattungsantrag für Bestellung {{orderNumber}} wurde genehmigt.\n\nBetrag: {{refundAmount}}\n\nDer Betrag wird innerhalb von {{refundDays}} Werktagen Ihrer Zahlungsmethode gutgeschrieben.\n\n[[button:Zu meinem Konto]]" },
    en: { subject: "Your refund is approved · {{orderNumber}}", preheader: "Your {{refundAmount}} refund is being processed.", body: "# Refund approved\n\nHi {{customerName}}, your refund request for order {{orderNumber}} has been approved.\n\nRefund amount: {{refundAmount}}\n\nThe amount will reach your payment method within {{refundDays}} business days.\n\n[[button:Go to my account]]" },
  },
  "support-notification": {
    tr: { subject: "Destek talebinize yanıt var · {{ticketNumber}}", preheader: "{{ticketSubject}}", body: "# Talebinize yanıt verildi\n\nMerhaba {{customerName}}, \"{{ticketSubject}}\" konulu destek talebinize ({{ticketNumber}}) yeni bir yanıt var.\n\n[[button:Yanıtı görüntüle]]" },
    de: { subject: "Neue Antwort auf Ihre Support-Anfrage · {{ticketNumber}}", preheader: "{{ticketSubject}}", body: "# Neue Antwort auf Ihre Anfrage\n\nHallo {{customerName}}, es gibt eine neue Antwort auf Ihre Support-Anfrage ({{ticketNumber}}) \"{{ticketSubject}}\".\n\n[[button:Antwort ansehen]]" },
    en: { subject: "New reply to your support request · {{ticketNumber}}", preheader: "{{ticketSubject}}", body: "# You have a new reply\n\nHi {{customerName}}, there is a new reply to your support request ({{ticketNumber}}) \"{{ticketSubject}}\".\n\n[[button:View reply]]" },
  },
  "account-deletion": {
    tr: { subject: "Hesabınız silindi", preheader: "Hesap silme talebiniz tamamlandı.", body: "# Hesabınız silindi\n\nMerhaba {{customerName}}, hesap silme talebiniz {{deletionDate}} tarihinde tamamlandı. Kişisel verileriniz yasal saklama yükümlülükleri dışında kaldırıldı.\n\nBu işlemi siz istemediyseniz hemen destek ekibimizle iletişime geçin.\n\n[[button:Destek ile iletişime geç]]" },
    de: { subject: "Ihr Konto wurde gelöscht", preheader: "Ihre Löschanfrage ist abgeschlossen.", body: "# Ihr Konto wurde gelöscht\n\nHallo {{customerName}}, Ihre Löschanfrage wurde am {{deletionDate}} abgeschlossen. Ihre personenbezogenen Daten wurden, abgesehen von gesetzlichen Aufbewahrungspflichten, entfernt.\n\nWenn Sie dies nicht veranlasst haben, kontaktieren Sie bitte sofort unseren Support.\n\n[[button:Support kontaktieren]]" },
    en: { subject: "Your account has been deleted", preheader: "Your deletion request is complete.", body: "# Your account has been deleted\n\nHi {{customerName}}, your account deletion request was completed on {{deletionDate}}. Your personal data has been removed, except where the law requires us to keep it.\n\nIf you didn't request this, please contact our support team right away.\n\n[[button:Contact support]]" },
  },
};
