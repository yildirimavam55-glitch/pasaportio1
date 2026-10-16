# V2 storefront CMS rules

- Homepage catalogue media overrides use stable ISO/region keys in the existing versioned CMS document and collected media IDs; default photos remain fallbacks, Global is a regional card, and comparisons stay stored but unrendered on home — why: image editing must never duplicate catalogue, storage, pricing or publish systems.

- Global uses the shared regional card and REGION_DISCOVERY media fallback, not a separate banner — why: one destination, one editable image path.

- Installation education shares CentralInstallationWalkthrough and InstallationExperience primitives: preserve the homepage preview while central platform-specific scene registries feed credential-free EducationalPhone screens, with optional playback and owner data outside the phone; APN requires provider data — why: one reusable educational system without homepage or credential regressions.
- Central manual phone interiors use separate original Android/iOS screen components and reserved nonfunctional demo constants; style them only through the manual-os scope — why: realistic platform hierarchy without changing homepage, QR/link presentation or exposing credentials.
- Manual email scenes consume illustration-only localized copy and shared demo constants, never delivery templates or clipboard APIs; extended manual navigation scrolls within its fixed-width center — why: teach email-to-settings transfer without sending mail, exposing credentials or shrinking step targets.

- Homepage trust and review content lives in the existing V2 CMS document; public reads require both verified and published review flags so unapproved customer content stays private.
- Fictional editorial review fixtures and inactive payment visuals render only in the V2 CMS preview iframe; public V2 reads strip editorial/demo reviews and never imply unavailable payment methods are active.
- The V2 Social Proof main media is a CMS-selected lifestyle photo in a fixed responsive frame, never a phone mask; keep its chips as independent editable items so image replacement needs no code change.
- Trust benefit visuals resolve each item's existing CMS media ID or selected icon through the shared V2 media registry; preserve per-item Admin editing rather than embedding card-specific assets in the rendering component.
- Trust benefit custom images use an optional per-item CMS scale and contained rendering; this compensates for differing artwork proportions without altering shared card dimensions or uploaded media.
- Store V2 Hero image crop presets as validated presentation values inside the existing CMS document; keep desktop and optional mobile settings independent and render one media asset through CSS so layout and uploads stay unchanged.
- Generate Trust/Social Proof storefront translations when an Admin finishes editing Turkish source text or requests regeneration, into existing CMS locale fields; retain automatic provenance inside each text value to avoid replacing manual edits and keep public rendering read-only.
- The roaming comparison uses CMS-localized structured copy and calculated prices with reveal-once presentation or the retained CMS image mode; price edits return it to draft and only VERIFIED figures render publicly, so visual changes never bypass approval.
- Final family/reviews/comparison presentation stays in the existing V2 CMS section; published comparisons require the shared verified-evidence gate, while explicitly approved sample prices use the existing development/editor preview gate and localized disclosure; equal-width tracks use a reveal-once CSS transform — why: previews must never change commerce or imply verified public offers.
- The eSIM hero reuses the V2 CMS media/crop settings, shared country picker and device catalogue; localized campaign display fields live in the existing banner_text map, with shared-query invalidation and cross-tab notification — why: Admin remains the sole content source without duplicating search, compatibility or discount logic.
- Mobile hero photo fixtures are independent from desktop fixtures and remain subordinate to CMS-selected media — why: mobile reference corrections must not replace approved desktop imagery or Admin uploads.
- The antenna signal SVG follows the photo's cover/crop/scale inside its clipped wrapper and hides when the antenna falls outside the crop, so the arcs stay anchored across widths.
- The hero trust row renders the Admin-edited BENEFIT_ROW section (icon, localized label, link, order, visibility); built-in copy is only a fallback so saved values always win.
- Trust-row icons remain static with no observer or hover motion; the retained hook interface leaves the hero renderer untouched, and compact discovery overrides stay homepage-scoped — why: preserve CMS authority, carousel behavior and protected hero geometry.
- Review presentation uses the existing CMS source statistics and count-weighted aggregate; review samples require a genuine preview host independently of payment/comparison demo flags, so public demo approval never substitutes for review evidence.
- Reviews use the existing Embla engine with a naturally sized non-scrolling track and horizontal-only transforms; localized CMS texts retain original attribution and expanded reading pauses autoplay — why: main-page gestures and reading position must remain independent of slide changes.
- Homepage entrances reuse Reveal, shared entry/resource observers and the sanitized theme toggle; motion never gates data or transforms sticky controls — why: first rendering and carousel scrolling stay independent.

- The shared installation walkthrough renders only the phone scene, its educational caption, numbered step navigation and playback control; step titles and descriptions stay out of the visible layout, kept as a screen-reader live region — why: the animation itself teaches each step and the owner removed the duplicated copy below it.
- Editor click-to-edit wraps sections in display:contents `data-v2-edit-id` hosts only inside the named preview frame, and undo/redo lives only in editor memory — why: customer markup and saved/published data stay untouched.
- V2 pickers share `V2PickerSheet`; preserve mobile scroll/x-position and visual-viewport keyboard handling, with guarded pointer-up selection.
- V2 country pages reuse central photos, device checker, catalogue queries, and cart state; never duplicate these systems.
- V2 promotion copy stores one Turkish source plus locale translations; storefront never runtime-translates campaigns or duplicates codes/values.
- The eSIM homepage has one compact compatibility card opening the shared DeviceCheckSheet; floating support moves only on measured card overlap — why: no duplicate checker or narrowed card.
- Homepage loader primes only layout and the shared country-price query; other sections load client-side with fixed placeholders, and `Reveal` is visible by default.
- Homepage images use ISO/region CMS overrides, collected media and central fallbacks; Global shares regional cards — why: no duplicate systems.
- One shared PaymentStrip uses story CSS ordering for desktop copy/mobile below-photo placement — why: never duplicate availability data.
- Theme editor reuses global config; homepage light roles exclude Hero/header. Dark ink targets wrapper/story consumers, not Hero/prices — why: local tokens beat root themes.
- AI trip planner lives at /esim/plan (TripPlanner.tsx + lib/trip-planner.functions.ts): the model only ranks/explains real catalogue packages fetched server-side via loadEsimPackages; saved trips stay in localStorage, no DB table — why: recommendations must never invent products or prices, and reuse needs no schema change.
