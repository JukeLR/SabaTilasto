-- Päivitä olemassa olevat sarakkeet ja lisää uudet sarakkeet games-taulukkoon

-- 1. Muuta team_goals ja opponent_goals sarakkeiden tyypit
-- (OM ja TM erikoiskoodit, muut erikoiskoodit poistetaan)

-- Päivitä kommentit heijastelemaan muutosta
COMMENT ON COLUMN games.team_goals IS 'Oman joukkueen maalit: pelaaja ID tai OM (oma maali)';
COMMENT ON COLUMN games.opponent_goals IS 'Vastustajan maalit: pelaaja ID tai TM (tasoitusmaali)';

-- 2. Lisää uudet sarakkeet

-- Syöttöpisteet (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN assists INTEGER[];

-- Plussat (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN plus_points INTEGER[];

-- Miinukset (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN minus_points INTEGER[];

-- Maalityyppi (NM, AV, YV, TM, RL)
ALTER TABLE games 
ADD COLUMN goal_type TEXT[];

-- 3. Nimeä goalie_blocks uudelleen
ALTER TABLE games 
RENAME COLUMN goalie_blocks TO goalie_game_interruption;

-- Lisää kommentit uusille sarakkeille
COMMENT ON COLUMN games.assists IS 'Syöttöpisteet: pelaaja ID:t';
COMMENT ON COLUMN games.plus_points IS 'Plussat: pelaaja ID:t';
COMMENT ON COLUMN games.minus_points IS 'Miinukset: pelaaja ID:t';
COMMENT ON COLUMN games.goal_type IS 'Maalityyppi: NM (normaali), AV (alivoimamaali), YV (ylivoimamaali), TM (tasoitusmaali), RL (rangaistuslaukaus)';
COMMENT ON COLUMN games.goalie_game_interruption IS 'Maalivahdin pelinkatkot: pelaaja ID:t';
