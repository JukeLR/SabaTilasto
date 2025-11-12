-- Poista user_id sarake games-taulukosta
-- Pelit eivät ole käyttäjäkohtaisia, vaan kaikkien nähtävillä
-- Suorita tämä Neon SQL Editorissa

-- Poista ensin indeksi
DROP INDEX IF EXISTS idx_games_user_id;

-- Poista user_id sarake
ALTER TABLE games 
DROP COLUMN IF EXISTS user_id;
