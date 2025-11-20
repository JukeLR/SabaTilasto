-- Lisää goalie_change sarake peleihin, jos ei ole jo olemassa
ALTER TABLE games ADD COLUMN IF NOT EXISTS goalie_change INTEGER DEFAULT 0;
-- Päivitä kaikki null-arvot nollaksi
UPDATE games SET goalie_change = 0 WHERE goalie_change IS NULL;
