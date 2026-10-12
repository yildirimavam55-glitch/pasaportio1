# Customer panel minimal fix — findings and plan

## Findings (read-only, verified)
1. **Why profiles has 0 rows:** the sign-up step that creates a profile is not connected to account creation. The function `handle_new_user` exists, but no trigger calls it (checked in the live database: 0 triggers). It was lost when the database was restored. So no new account gets a profile row automatically.
2. **Saving works anyway:** "Save" on the profile page does an upsert (`updateCustomerProfile`). The owner policies allow insert and update, so the first save creates the missing row. Reading copes with a missing row too: the page falls back to the sign-in email, Turkish and empty fields, so nothing crashes.
3. **QR:** `EsimInstallGuide` already shows a "no QR" message instead of a broken image, and an expired message when the eSIM has expired. The QR is only drawn when real activation data exists.
4. **eSIM data:** the list and detail pages already show an empty state, and usage figures appear only when real values are stored (planned and tested in `customer-esim.test.ts`).

## Proposed changes
- **No code change needed for profile, QR or empty eSIM states.** They already behave as requested.
- **Real fix needed (not allowed under current rules):** reconnect the sign-up trigger (one small change on the database's account table). This counts as a migration, so it is not done. It is recorded as an open item for the move or a later approval.
- Optional, only if you approve: no file changes are planned right now.

## Tests (only after approval, all read-only)
- Mobile 390px check of `/account`, `/account/esims` (empty state) and `/account/profile`, signed in with the existing admin session, without pressing Save (pressing it would write to the live database).
- Run the existing account tests (`customer-esim.test.ts`).

## Not touched
0008/0009, payments, provisioning, install animations, logo, home page, PDF.
