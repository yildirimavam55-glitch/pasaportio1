-- PENDING — NOT APPLIED. Document issuance (invoice / credit-note numbering + private PDF storage).
-- Apply only after: real issuer + tax data supplied by the owner, payment integration approved,
-- and an explicit approval to enable issuing. Move into drizzle/migrations at that time.
-- Postgres 15+; no Lovable-specific features. Private bucket "documents" is created separately
-- (storage tooling / S3-compatible store), never public.

-- 1) Legal issuer — single row, filled by the owner. Snapshotted into every issued document.
CREATE TABLE public.legal_issuer (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  legal_name text NOT NULL,
  address text NOT NULL,
  country text NOT NULL CHECK (char_length(country) = 2),
  tax_id text NOT NULL,
  tax_scheme text NOT NULL,             -- e.g. 'EU_OSS', 'TR_KDV' — decided by the owner's accountant
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- 2) Gap-free numbering: one counter per (series, year). Allocation happens inside the same
--    transaction as the issued_documents insert, so a rollback never burns a number.
CREATE TABLE public.document_sequences (
  series text NOT NULL CHECK (series IN ('INV','CN')),
  year integer NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  last_value integer NOT NULL DEFAULT 0 CHECK (last_value BETWEEN 0 AND 999999),
  PRIMARY KEY (series, year)
);

-- 3) Issued documents — immutable after insert (only storage_path/status may move forward).
CREATE TABLE public.issued_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('invoice','order-summary','credit-note','esim-guide')),
  document_number text UNIQUE,          -- PSP-INV-YYYY-NNNNNN / PSP-CN-YYYY-NNNNNN; NULL for non-legal kinds
  user_id uuid NOT NULL,                -- owner (customer); plain uuid, no FK to auth.users
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  refund_request_id uuid REFERENCES public.refund_requests(id) ON DELETE RESTRICT,
  original_document_id uuid REFERENCES public.issued_documents(id) ON DELETE RESTRICT, -- credit note → invoice
  locale text NOT NULL,
  currency text NOT NULL CHECK (char_length(currency) = 3),
  gross_cents bigint NOT NULL,
  net_cents bigint,
  tax_cents bigint,
  data_snapshot jsonb NOT NULL,         -- allowlisted DocumentData incl. issuer snapshot; never secrets/QR
  template_version integer NOT NULL,
  storage_path text,                    -- private bucket key: <user_id>/<id>.pdf
  sha256 text,
  status text NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','VOIDED')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid,
  CHECK ((kind IN ('invoice','credit-note')) = (document_number IS NOT NULL)),
  CHECK (kind <> 'credit-note' OR (original_document_id IS NOT NULL AND refund_request_id IS NOT NULL))
);
CREATE INDEX issued_documents_user_idx ON public.issued_documents (user_id, issued_at DESC);
CREATE INDEX issued_documents_order_idx ON public.issued_documents (order_id);

REVOKE ALL ON public.legal_issuer, public.document_sequences, public.issued_documents FROM anon, authenticated;
GRANT SELECT ON public.issued_documents TO authenticated;     -- RLS limits to own rows / admins
GRANT SELECT ON public.legal_issuer TO authenticated;         -- RLS limits to admins
GRANT ALL ON public.legal_issuer, public.document_sequences, public.issued_documents TO service_role;

ALTER TABLE public.legal_issuer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read issuer" ON public.legal_issuer FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Owners read own documents" ON public.issued_documents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
-- No INSERT/UPDATE policies: issuing runs only in a server function with the service role,
-- after verifying a PAID order (or PROCESSED refund) and the documents_issuing_enabled flag.

CREATE OR REPLACE FUNCTION public.next_document_number(_series text, _year integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v integer;
BEGIN
  INSERT INTO public.document_sequences (series, year, last_value) VALUES (_series, _year, 1)
  ON CONFLICT (series, year) DO UPDATE SET last_value = public.document_sequences.last_value + 1
  RETURNING last_value INTO v;   -- row lock serialises concurrent issuers
  RETURN format('PSP-%s-%s-%s', _series, _year, lpad(v::text, 6, '0'));
END $$;
REVOKE ALL ON FUNCTION public.next_document_number(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_document_number(text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.issued_documents_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Belgeler silinemez; iptal icin alacak dekontu kullanin.'; END IF;
  IF NEW.kind, NEW.document_number, NEW.user_id, NEW.order_id, NEW.gross_cents, NEW.data_snapshot, NEW.issued_at
     IS DISTINCT FROM OLD.kind, OLD.document_number, OLD.user_id, OLD.order_id, OLD.gross_cents, OLD.data_snapshot, OLD.issued_at
  THEN RAISE EXCEPTION 'Duzenlenmis belge degistirilemez.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER issued_documents_immutable BEFORE UPDATE OR DELETE ON public.issued_documents FOR EACH ROW EXECUTE FUNCTION public.issued_documents_guard();

-- Feature flag stays OFF:
-- INSERT INTO public.feature_flags (key, enabled, ...) VALUES ('documents_issuing_enabled', false, ...);
