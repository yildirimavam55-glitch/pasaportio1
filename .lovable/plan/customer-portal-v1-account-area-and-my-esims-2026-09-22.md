# Customer Portal V1 — account area and My eSIMs

## What we build

A real customer account area at `/account`, built on the existing sign-in, with these sections:

1. Overview (Genel Bakış) — greeting, active eSIMs, quick links
2. eSIM'lerim — active / waiting-to-install / past, plus a detail page per eSIM
3. Siparişlerim — list and order detail
4. Profil ve Hesap — personal details, language, account management
5. Güvenlik — password change, login methods
6. Bildirimler — marketing vs. essential notifications
7. Destek — help topics with the order/eSIM referenced

Mobile: card-based account home with a simple section list, no permanent bottom bar. Tablet/desktop: compact side navigation. Travely design system only (petrol/cream/orange CTA/mint success, rounded cards, soft shadows). The reference screenshot is inspiration, not a template.

The existing `/hesabim` page becomes a redirect to `/account` so old links keep working; its working eSIM card logic is reused, not rebuilt.

## Real data only

Every figure comes from the customer's own stored purchase/order records. Nothing is invented:

- Remaining data, remaining days, ICCID, QR, network, supported countries: shown only when the record actually holds them.
- When the supplier gives no usage data: "Kalan kullanım bilgisi sağlayıcı tarafından sunulmuyor."
- When the supplier reports consumed instead of remaining, remaining is computed and clamped to 0–100%.
- Empty account shows a polished "Henüz bir eSIM'in yok." state with an "eSIM bul" button.
- Regional/global packages show a searchable real coverage country list ("Avrupa · 35 ülke → Ülkeleri görüntüle") sourced from stored package coverage.

## Actions, only when truly supported

- QR kodunu göster / Kurulum rehberi: loaded per eSIM only for its owner, separate iPhone and Android steps, installation clearly distinguished from activation, validity wording follows the package's real activation policy.
- Ek paket al: only when top-up is genuinely available for that eSIM's provider; otherwise the customer is routed to buying a compatible new package instead of a fake top-up.
- Tekrar satın al: opens the storefront with the same destination context and re-reads today's live availability and price — never the old price.

## Security

- Every account read/write is checked server-side against the signed-in user; changing an id in the URL returns not-found, never another customer's data. We test these id-swap cases explicitly.
- QR/activation details load only on demand for the owner and are never included in list responses or logs.
- Supplier cost, margin, credentials and internal logs are never exposed.
- Password change uses the existing secure auth mechanism. If the account signed in only with Google, no misleading password form is shown — the connected login method is shown instead.
- Email change goes through a verification flow, not a silent overwrite.
- Hesabı sil: consequences → re-confirmation → final confirmation, and it files a privacy deletion request that anonymises personal account data while keeping legally required order/accounting records and not breaking an active eSIM. No destructive cascade.

## Database (additive only)

Two small additions, no destructive migration, nothing touched in the catalogue, supplier sync, prices or publication state:

- notification preferences per customer (marketing on/off with consent timestamp and source; essential order/security messages are always kept separate and cannot be switched off)
- account deletion requests (status, requested time), processed as a privacy workflow

Both are locked to the owning customer.

## Honest limits to state in the UI

- Active-sessions management ("diğer cihazlardaki oturumları kapat") is offered only if the auth layer supports it; otherwise it is not shown at all rather than faked.
- Invoice/receipt download is not implemented, so no document button is shown.
- Live supplier usage refresh and real top-up calls are not connected yet, so those actions stay honestly unavailable instead of appearing to work.
- Phone and billing address are not collected; profile edits cover name, email (verified flow) and preferred language.

## Testing before we call it done

- 360 / 375 / 390 / 412 / 430 px plus tablet and desktop: no horizontal overflow, readable cards, QR modal fits, long country lists scroll, touch targets large enough.
- Homepage sticky destination search and the hamburger menu must not appear over the account UI.
- TR / DE / EN using the existing translation system, light and dark.
- Ownership tests for eSIM, order, QR, profile and notification routes.
- Homepage, destination search, Lounge, supplier catalogue, prices and payment integration stay untouched.
