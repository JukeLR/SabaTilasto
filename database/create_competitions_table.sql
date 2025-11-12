-- Luo series-taulukko (Sarjat/Turnaukset)
-- Suorita tämä Neon SQL Editorissa ensin

CREATE TABLE IF NOT EXISTS series (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    season VARCHAR(50),  -- Esim. "2024-2025" tai "Kevät 2024"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lisää games-taulukkoon viite sarjaan
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS series_id INTEGER REFERENCES series(id) ON DELETE SET NULL;

-- Luo indeksi nopeampaa hakua varten
CREATE INDEX IF NOT EXISTS idx_games_series ON games(series_id);
