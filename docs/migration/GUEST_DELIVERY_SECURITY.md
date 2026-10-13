# Guest delivery — security notes (S1–S3)

Feature stays OFF until 0011 is applied on the new host and `GUEST_DELIVERY_ENABLED=1` is set.

- **S1 atomic renewal codes:** each confirm first reserves one attempt with a single conditional
  `UPDATE … WHERE attempts = n AND attempts < 5 AND used_at IS NULL AND expires_at > now()`; only one
  concurrent request can win. Consumption is `UPDATE … SET used_at WHERE used_at IS NULL`. A new code
  voids older unused codes. Verified with 50 parallel statements on isolated PostgreSQL: 1 winner each.
- **S2 revocation:** issuing a link sets `used_at` on all earlier active DELIVERY rows; lookups filter
  `used_at IS NULL`.
- **S3 token exposure:** links are `/teslimat#<token>`. The fragment is never sent to the server, so
  it cannot appear in access logs, server logs or Referer headers. The page removes it from the address bar
  immediately; error reports use `location.pathname` only; the token is sent only in POST bodies;
  no app code logs it. Page sets `referrer: no-referrer` and `noindex`.

## Hosting-level items the app cannot control
1. **Edge/CDN/WAF request-body logging** (e.g. Cloudflare Logpush with request bodies, WAF payload
   logging): disable body logging for `/_serverFn/*`, because the token travels in the POST body.
2. **Application-performance/session-replay tools** added later (Sentry Replay, LogRocket, Hotjar): mask
   `/teslimat` and do not record network bodies of server-function calls.
3. **Email provider click-tracking**: disable link rewriting/tracking for delivery emails; tracked links
   pass the full URL (including the fragment) through the provider.
4. **Editor/preview telemetry** of the current platform is outside the app; irrelevant after migration.
