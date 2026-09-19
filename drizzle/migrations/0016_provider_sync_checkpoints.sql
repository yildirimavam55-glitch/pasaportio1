ALTER TABLE public.provider_sync_runs
  ADD COLUMN IF NOT EXISTS checkpoint_page integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_processed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_checkpoint_at timestamptz;

CREATE INDEX IF NOT EXISTS provider_sync_runs_active_idx
  ON public.provider_sync_runs (provider_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS provider_raw_items_run_idx
  ON public.provider_raw_items (provider_id, last_sync_run_id);