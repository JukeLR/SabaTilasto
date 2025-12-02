CREATE TABLE IF NOT EXISTS shotMap (
    id SERIAL PRIMARY KEY,
    x DECIMAL(4,3) NOT NULL,
    y DECIMAL(4,3) NOT NULL,
    team TEXT,
    opponent TEXT,
    player_id INTEGER
);
