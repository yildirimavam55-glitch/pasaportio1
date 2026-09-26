<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Public installation instructions live in a V2 guide route; real QR, activation credentials, and package policy stay in authenticated account views to avoid exposing provisioning data.

V2 destination, airport, and vignette pickers share `V2PickerSheet`; scope mobile scroll-lock width overrides to its open sheet and suppress trigger refocus on close so the storefront keeps its x-position and scroll location.
Measure the visual viewport for focused V2 picker inputs and confine the result list above the mobile keyboard; viewport units alone do not track iOS keyboard occlusion.

Resolve V2 picker result taps on pointer release with movement/cancellation guards while deferring blur-driven viewport updates; iOS can suppress click when keyboard resizing moves a row mid-gesture.

Keep a GIN index on eSIM coverage country arrays because public country-package reads filter with array containment and otherwise risk database timeouts.
- i18n: one locale registry (`src/i18n/locales.ts`); languages without their own resources set `content: "en"` and are translated through `localize()` + static JSON resources in `src/i18n/resources/` — keeps one component system without widening every copy object.
