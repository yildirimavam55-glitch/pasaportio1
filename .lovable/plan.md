# Mobile customer journey final UX fixes

## Scope
- Keep the approved homepage structure, theme, catalogue, pricing, Finder, checkout, Guides, and backend logic unchanged.
- Reuse the existing selected-package purchase bar and package details sheet.

## Changes
- Keep the mobile purchase bar conditional on a valid selected product, compact and safe-area aware; make the existing Continue action the standard petrol primary action and clearly label the selected package.
- Continue using the selected catalogue product’s live `salePrice`, currency, data allowance, validity, cart snapshot, and `/sepet` navigation.
- In package details, show the supplier-backed activation policy when known; otherwise show the localized neutral pre-purchase message without inventing supplier behavior.
- Confirm the homepage destination-search action already uses the petrol primary variant; change only if rendered output disproves it.
- Confirm no application-owned “Edit with Lovable” overlay exists and make no CSS workaround for editor chrome.

## Verification
- Test the real mobile journey at 360, 390, and 430 px in TR, DE, and EN, including selection, details, displayed price, Continue navigation, safe-area/content clearance, menus, and sheets.
- Verify Guides remain visible and the homepage is otherwise unchanged.
- Run focused and existing tests, type checks, and inspect the latest preview build result.
