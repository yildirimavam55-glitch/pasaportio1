# Direct eSIM purchase flow (country → plan → cart)

## Goal
A customer picks a country and lands on real, buyable packages immediately. The long
step-by-step eSIM helper stops being the main path but stays available on demand.

## 1. Home entry (shared for eSIM and Lounge)
- Under the existing eSIM / Lounge switch, add one search field that changes with the service:
  - eSIM: "Nereye gidiyorsun?" with country autocomplete (flag + country name, from the
    existing country dataset).
  - Lounge: "Hangi havalimanı?" with airport autocomplete (existing airport dataset).
- Selecting a suggestion, tapping the search icon, or pressing Enter goes straight on:
  - eSIM → package page with only the destination.
  - Lounge → existing Lounge search panel/results, unchanged.
- The long eSIM helper (trip type, days, travellers, intensity, usage chips, estimated GB,
  recommendation card) is removed from the normal path. It stays in the code and opens only
  through an optional link: "Hangi pakete ihtiyacın olduğunu bilmiyor musun? Paket yardımcısını kullan →".
- Service switching keeps the current position and soft transition; no jump to the hero.

## 2. Package page without helper data
- Entering with only a destination runs a direct catalogue mode:
  destination → real eligible catalogue products → existing classification → display.
- In direct mode: no estimated/required usage box, no automatic "Önerilen" label, no fake
  recommendation from a zero data need. Arriving from the helper keeps today's behaviour.
- Page top: flag + country + "Tarifeni seç", a small "Ülkeyi değiştir" action, and the
  compact pastel compatibility CTA.

## 3. Plan selection
- Large segmented control: Standart | Sınırsız, Standart default, switching swaps the grid
  in place with no reload.
- Standart: real exact/local non-unlimited packages for that country.
- Sınırsız: real local unlimited packages, one card per real validity (existing dedupe),
  plus at most 1–2 "Diğer bölgelerde sınırsız" cards kept separate.
- Two-column compact mobile grid, no horizontal scrolling for the main tariff choice.
- Card shows only data, validity, coverage flag, price, and selected state.

## 4. After selection
- One selection only, using the existing selected-product state.
- Compact "Kaç eSIM?" stepper appears after a product is chosen, default 1.
- Sticky purchase bar updates instantly and always matches the selected card and the cart.

## Technical details
- New optional `mode` handling on `/esim/paketler`: when no usage/required parameters arrive,
  skip the recommendation hand-off and fold that product back into its normal tab.
- Presentation-only edits in `TravelExperience.tsx`, `Finder.tsx`, `esim.paketler.tsx`,
  a small country/airport autocomplete component, and `styles.css`.
- No changes to provider sync, catalogue, classification rules, pricing, cart, checkout,
  auth, admin, or service controls. No country- or airport-specific rules.
- All new labels added to the existing TR/DE/EN copy structures.

## Verification
- TR, DE, FR, US, JP in TR/DE/EN locales at 360–430px: search → Enter → products load →
  Sınırsız tab works → select → quantity → sticky bar → correct product in cart.
- Confirm the long helper no longer appears in the normal purchase path.
