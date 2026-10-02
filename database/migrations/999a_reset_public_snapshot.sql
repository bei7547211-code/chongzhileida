-- Both views are published in one row/statement, never independently.
ALTER TABLE reset_relay_snapshot ADD COLUMN IF NOT EXISTS public_payload jsonb;
