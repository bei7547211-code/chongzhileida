CREATE TABLE IF NOT EXISTS relay_news_sources (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  checked_at timestamptz,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  failed boolean NOT NULL DEFAULT false
);
