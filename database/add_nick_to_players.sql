-- Lisää nick-sarake players-taulukkoon
ALTER TABLE players ADD COLUMN IF NOT EXISTS nick VARCHAR(100);
