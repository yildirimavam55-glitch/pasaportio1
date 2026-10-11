/** WhatsApp support number in international format, digits only. */
export const WHATSAPP_NUMBER = "4915203555596";

/** Builds a wa.me deep link that opens a WhatsApp chat with the support number. */
export function waLink(message = "Merhaba Travely, yardıma ihtiyacım var.", number?: string) {
  const digits = number && /^\d{8,15}$/.test(number) ? number : WHATSAPP_NUMBER;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
