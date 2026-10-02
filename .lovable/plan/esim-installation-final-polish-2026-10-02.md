# eSIM Installation Final Polish

## Scope
- Preserve the existing homepage and detailed guide structure, illustrations, content, locale system, public-demo privacy, and surrounding sections.
- Change presentation and interaction only; no database, commerce, supplier, provisioning, security, dependency, or publishing work.

## Homepage
- Increase only the desktop phone/demo prominence by roughly 15–20% within the current section height and rebalance the existing two-column space.
- Refine the compact Quick Install / QR selector so active, inactive, hover, focus, and clickability are clearer without becoming a primary CTA.
- Preserve the current Quick → tap → loading → success → QR → scan → loading → success loop, visibility pause, reduced-motion behavior, and clean method-reset timing.

## Detailed guide
- Add a compact localized “Quick Install recommended on compatible devices” introduction and a small recommended badge on Quick Install.
- Keep iPhone/Android, four Quick steps, five QR steps, phone visuals, text, and travel-use guidance unchanged.
- Refine interactive step controls and Previous/Next hierarchy using existing mint/petrol styling; keep Previous disabled only on step 1 and give the final step an appropriate restart/completion action.
- Preserve one autoplay timer: about 3 seconds for instructions, 4 seconds for success; every method, platform, arrow, or direct-step action cancels and restarts it.

## Accessibility and motion
- Keep semantic tab/current-step state, localized labels, keyboard operation, focus visibility, and minimum mobile touch targets.
- Keep the shared neutral tap animation only on actual tap steps; remove colored target cues and disable autoplay/tap movement for reduced motion.

## Verification
- Test homepage and guide at 360, 390, 430, tablet, and desktop sizes for fit, clipping, overlap, layout stability, and controlled height.
- Test keyboard controls, reduced motion, Previous/Next/direct-step timer resets, both method cancellation directions, duplicate-timer prevention, selector synchronization, full homepage loop, and public-demo-only data.
- Run focused locale/content tests, type checks, and the preview build check; do not publish.
