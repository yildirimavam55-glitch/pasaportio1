# Pasaport.io — Vercel staging

Arbeitsbranch: `integration/cursor-vercel-staging`  
Eigenes Supabase-Projekt: `mnquhlhahgbztjypuqxn`  
Keine DNS-Umstellung, keine Stripe-Live-Zahlungen, kein Shopstart.

## Lokal

```bash
bun install
bun run dev --host 0.0.0.0 --port 43145
```

Die lokale Cloud-Agent-`.env` bleibt am bestehenden Lovable-Katalog, damit die Vitrine nicht gegen eine leere Datenbank läuft.

Eigenes Projekt nur lesen:

```bash
cp env.own-supabase.example .env.own-supabase
# publishable key lokal eintragen, nie committen
bun run check:own-supabase
```

## Gehärtetes Schema (nur Wegwerf-Postgres)

```bash
bun run schema:harden
bun run schema:test-local
```

`db/baseline/0000_baseline_schema.sql` wird **nicht** angewendet.  
`db/staging/0001_hardened_schema.sql` ist die bereinigte Datei.  
Cloud-Apply auf `mnquhlhahgbztjypuqxn` ist absichtlich nicht verdrahtet.

## Vercel-Preview (nur nach Freigabe)

1. Branch `integration/cursor-vercel-staging` in Vercel als Preview importieren.
2. Variablen aus `env.vercel-staging.example` setzen. `COMMERCE_LIVE_PROVISIONING` und `PAYMENTS_LIVE` bleiben `false`.
3. In Supabase Auth die Preview-URL als Redirect zulassen (`https://<preview>.vercel.app/auth/callback`).
4. Google/Apple Provider-Secret in GoTrue eintragen, sonst bleibt OAuth `Unsupported provider`.
5. Test-Admin erst nach Schema-Freigabe über `db/staging/0003_test_admin.example.sql` (keine echten Kundenkonten).

Build: `NITRO_PRESET=vercel bun run build` (steht in `vercel.json`).
