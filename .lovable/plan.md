# V2 regional package cart identity

## Scope
- Keep the approved Unlimited selection, all prices, catalogue rows, ranking, Admin, payments, provisioning, and production storefront unchanged.
- Correct only V2 customer-facing product identity from package selection through cart and checkout, while safely improving current-order snapshots where the selected product metadata is available.

## Implementation
- Reuse the existing package-scope and normalized region metadata to produce one localized product identity for country, regional, and global packages.
- Store the selected package's real classification, destination intent, normalized region family, and coverage count in the existing cart line snapshot.
- Render the same identity and real coverage count in V2 package details, cart, and checkout without exposing supplier titles.
- Preserve backward compatibility for existing locally stored cart lines and avoid rewriting historical orders.

## Verification
- Test Türkiye country vs Europe package and Germany country vs Europe package.
- Confirm cart and checkout identity in Turkish, German, and English.
- Verify raw supplier names remain hidden and Unlimited counts, IDs, prices, and selection behavior do not change.
- Confirm no catalogue sync, supplier purchase, payment, database mutation, production route change, or publish action occurs.
