# Lovable-specific dependencies to replace on the new server

| Area | Where | Replacement |
|---|---|---|
| Backend (database, auth, storage) | `src/integrations/supabase/*` | Self-hosted or managed Postgres + auth with the same schema; users/passwords must be exported separately |
| Google sign-in broker | `src/integrations/lovable/index.ts`, `@lovable.dev/cloud-auth-js`, `AuthPage.tsx` | Direct OAuth with your own Google client ID/secret and redirect URLs |
| Apple sign-in (enabled, untested) | same | Own Apple Services ID, or remove the button |
| Preview session storage | `src/integrations/supabase/previewAuthStorage.ts` | Not needed; use standard client storage |
| Scheduled job authentication | `src/integrations/supabase/cron-auth.ts` | Own scheduler + shared secret header |
| AI translations (`LOVABLE_API_KEY`) | `legal-center`, `promotions`, `review-translate`, `trust-translate` functions | Any LLM API with your own key, or manual translations |
| Auth emails (password reset, confirmation) | managed by Lovable Cloud | Own SMTP / email provider; add new domain to allowed redirect URLs |
| Build config | `@lovable.dev/vite-tanstack-config` | Standard TanStack Start + Vite config; Cloudflare Workers (or Node) adapter |
| Hosting | Lovable (workerd) | Cloudflare Workers or another host supporting TanStack Start |

Notes
- `.env.development` contains an unused Stripe test publishable key (`VITE_PAYMENTS_CLIENT_TOKEN`); no code references it.
- Payments are intentionally not integrated; see `src/domain/payments/gateway.ts` for the provider-independent interface.
