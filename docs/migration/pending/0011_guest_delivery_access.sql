-- PENDING DRAFT — NOT APPLIED. Requires separate owner approval.
-- Server-only storage for guest delivery links (DELIVERY) and renewal codes (RENEWAL).
-- Only SHA-256 hashes are stored. No anon/authenticated access at all.
CREATE TABLE public.order_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('DELIVERY','RENEWAL')),
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, token_hash)
);
CREATE INDEX order_access_tokens_order_idx ON public.order_access_tokens (order_id, kind, created_at DESC);
REVOKE ALL ON public.order_access_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.order_access_tokens TO service_role;
ALTER TABLE public.order_access_tokens ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the server (service_role) reads or writes.
