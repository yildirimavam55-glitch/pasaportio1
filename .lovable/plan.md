# Final Customer Package QA and Corrections

## Scope
- Preserve the locked customer design and existing architecture.
- Change only failures confirmed in the current public eSIM/Lounge journey.
- Do not add payments, provider transactions, provisioning, QR generation, or another phase.

## Corrections
1. Normalize customer-facing package titles and commercial data amounts while retaining provider names internally.
2. Keep unlimited products as a distinct state and show real validity, coverage, capabilities, and localized sale prices.
3. List and rank only relevant catalogue options, keep recommendation and selection separate, and prevent an invalid first package from being auto-selected.
4. Add the compact coverage-country viewer for regional/global packages and accurate multi-route coverage text.
5. Add the existing-design purchase bar above mobile navigation, with one selected package and a clear Add to Cart action.
6. Preserve Finder state in the summary and return action; keep compatibility state session-aware.
7. Remove any remaining customer-visible internal/test wording found during verification.

## Verification and release
- Test the complete public journey in Turkish, German, and English.
- Verify recommendation, package selection, compatibility, cart, Lounge icons/cross-sell, and reveal behavior.
- Check 360, 390, and 430 px for overflow and fixed-layer overlap.
- Publish the approved correction and re-run the checks against the public URL.
