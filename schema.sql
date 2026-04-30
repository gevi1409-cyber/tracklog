-- Tracklog waitlist schema
-- Pegar en Neon SQL Editor (Console del proyecto → SQL Editor)

CREATE TABLE IF NOT EXISTS waitlist (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  source        TEXT DEFAULT 'landing',
  ip            TEXT,
  user_agent    TEXT,
  referer       TEXT,
  signup_count  INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para queries rápidas por fecha (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Índice para queries por origen (si después haces múltiples landing pages)
CREATE INDEX IF NOT EXISTS idx_waitlist_source ON waitlist(source);

-- Verificar que se creó bien
SELECT
  'waitlist creada con éxito' AS status,
  COUNT(*) AS rows_actuales
FROM waitlist;
