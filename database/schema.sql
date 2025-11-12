-- SabaTilasto tietokantaskeema
-- Suorita tämä Neon SQL Editorissa luodaksesi tarvittavat taulukot

-- Joukkueet (luodaan ensin, jotta users voi viitata siihen)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    home_city VARCHAR(100),
    age_group VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Käyttäjätaulukko (kirjautuminen ja autentikaatio)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    team_ids INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pelit
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    own_team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    opponent_team_name VARCHAR(100),
    game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    final_own_score INTEGER DEFAULT 0,
    final_opp_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Eräkohtaiset tilastot
CREATE TABLE IF NOT EXISTS period_stats (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    period_number INTEGER NOT NULL CHECK (period_number IN (1, 2, 3)),
    
    -- Oma joukkue
    own_goals INTEGER DEFAULT 0,
    own_blocked_shots INTEGER DEFAULT 0,
    own_missed_shots INTEGER DEFAULT 0,
    own_draws INTEGER DEFAULT 0,
    own_takeaways INTEGER DEFAULT 0,
    
    -- Vastustaja
    opp_goals INTEGER DEFAULT 0,
    opp_blocked_shots INTEGER DEFAULT 0,
    opp_missed_shots INTEGER DEFAULT 0,
    opp_draws INTEGER DEFAULT 0,
    opp_takeaways INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(game_id, period_number)
);

-- Pelaajat
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    team_ids INTEGER[],
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nick VARCHAR(100),
    jersey_number INTEGER,
    position VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pelaajan pelitilastot (jos haluat seurata yksittäisten pelaajien tilastoja)
CREATE TABLE IF NOT EXISTS player_game_stats (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    blocked_shots INTEGER DEFAULT 0,
    missed_shots INTEGER DEFAULT 0,
    takeaways INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(game_id, player_id)
);

-- Indeksit suorituskyvyn parantamiseksi
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_period_stats_game_id ON period_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_game_id ON player_game_stats(game_id);

-- Funktio päivittämään updated_at -aikaleima automaattisesti
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggerit updated_at päivitykseen
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_period_stats_updated_at BEFORE UPDATE ON period_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
