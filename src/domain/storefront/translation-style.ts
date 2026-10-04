/** Brand voice rules appended to every storefront CMS auto-translation prompt. */
export const STOREFRONT_TRANSLATION_STYLE =
  "Brand voice: friendly and direct. German (de) MUST use informal second person: du, dich, dir, dein, deine, deinen, deinem, deiner — never formal Sie, Ihnen, Ihr, Ihre. Address the customer informally in other languages where that is natural for consumer travel brands.";

const FORMAL_DE = /\b(Sie|Ihnen|Ihre[mnrs]?|Ihr)\b/;

/** True when a German text addresses the reader formally. Sentence-initial "Sie" can be ambiguous, so treat as a review signal only. */
export function looksFormalGerman(text: string): boolean {
  return FORMAL_DE.test(text);
}
