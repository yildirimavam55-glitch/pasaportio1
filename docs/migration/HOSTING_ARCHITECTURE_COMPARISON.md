# Hosting architecture comparison

Verified requirements: TanStack Start server runtime (edge worker or Node), PostgreSQL 15+ with RLS and Supabase-compatible auth/Data API (app uses supabase-js + `auth.uid()` in policies), object storage for images, a scheduler able to POST to two HTTPS routes, an e-mail provider, a fixed outbound IP if eSIM Go requires allowlisting. No prices given; costs are estimates to be quoted by vendors.

| | A. Managed app hosting + managed Supabase | B. VPS app + managed PostgreSQL/Supabase | C. Self-hosted app + self-hosted PostgreSQL/Supabase |
|---|---|---|---|
| Example shape | Cloudflare Workers/Vercel/Netlify + supabase.com project | Docker/Node on a VPS + supabase.com project | VPS/Kubernetes running app + self-hosted Supabase stack |
| Code changes | Smallest (worker target already used) | Switch Start adapter to Node (estimate: small) | Same as B + operate Supabase services |
| Auth & password hashes | Kept 1:1 | Kept 1:1 | Kept 1:1 if Supabase self-hosted |
| Fixed outbound IP (eSIM Go) | Often not available on edge hosts — may need proxy | Yes, VPS IP | Yes |
| Scheduler | Host cron (e.g. Workers cron) or external | System cron | System cron |
| Ops complexity | Low | Medium | High |
| Scalability | Automatic | Manual sizing | Manual |
| Security | Vendor-patched | You patch OS/runtime | You patch everything incl. DB/auth |
| Backups | Managed PITR | Managed DB backups | Your responsibility |
| Migration difficulty | Low–medium | Medium | High |

**Recommendation:** A, or A with a small fixed-IP proxy/VPS only for supplier calls if eSIM Go requires IP allowlisting. B is the fallback if a fixed IP for the whole app is preferred. C only with a dedicated operations person.
