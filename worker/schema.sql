-- Úložiště CRM: jeden gzip JSON dokument na klíč (db, agent-key, zálohy, limity) a fotky
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value BLOB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS files (
  key TEXT PRIMARY KEY,
  data BLOB NOT NULL
);
