-- Independent, additive migration. No upstream tables or old-site data are changed.
CREATE TABLE IF NOT EXISTS reset_relay_snapshot (
  id integer PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
