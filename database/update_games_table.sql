-- Luo games-taulukko Neon-tietokantaan
-- Suorita tämä Neon SQL Editorissa

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    own_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    opponent_team_name VARCHAR(100),
    game_location VARCHAR(200),  -- Pelipaikka
    game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lineup INTEGER[],  -- Peliin valitut pelaajat (ID-array)
    field_positions INTEGER[],  -- Kentälliset järjestyksessä (21 paikkaa)
    status VARCHAR(20) DEFAULT 'Luotu' CHECK (status IN ('Luotu', 'Käynnissä', 'Pelattu')),  -- Pelin tila
    notes TEXT,  -- Vapaat muistiinpanot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kommentti: 
-- lineup sisältää kaikki peliin valitut pelaajat (ID:t)
-- field_positions sisältää kentälliset järjestyksessä:
--   [0] = maalivahti
--   [1-5] = 1. kenttä (3 pelaajaa ylärivi, 2 alarivi)
--   [6-10] = 2. kenttä (3 pelaajaa ylärivi, 2 alarivi)
--   [11-15] = 3. kenttä (3 pelaajaa ylärivi, 2 alarivi)
--   [16-20] = 4. kenttä (3 pelaajaa ylärivi, 2 alarivi)
-- NULL = ei pelaajaa kyseisessä paikassa
