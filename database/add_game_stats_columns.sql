-- Lisää games-taulukkoon tilastointisarakkeet
-- Nämä mahdollistavat yksityiskohtaisen pelin tilastoinnin

-- Oman joukkueen maalit (sisältää pelaaja ID:t tai erikoiskoodit: AV, YV, TM, RL)
ALTER TABLE games 
ADD COLUMN team_goals TEXT[];

-- Vastustajan maalit (sisältää pelaaja ID:t tai erikoiskoodit: AV, YV, TM, RL)
ALTER TABLE games 
ADD COLUMN opponent_goals TEXT[];

-- Vedot maalia kohti (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN shots_on_goal INTEGER[];

-- Vedot ohi maalin (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN shots_off_target INTEGER[];

-- Vedot blokkiin (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN shots_blocked INTEGER[];

-- Blokkipisteet (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN blocks INTEGER[];

-- Vastustajan vedot ohi maalin (lukumäärä)
ALTER TABLE games 
ADD COLUMN opponent_shots_off INTEGER DEFAULT 0;

-- Torjunnat (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN saves INTEGER[];

-- Maalivahdin katkot (pelaaja ID:t)
ALTER TABLE games 
ADD COLUMN goalie_blocks INTEGER[];

-- Lisää kommentit sarakkeille
COMMENT ON COLUMN games.team_goals IS 'Oman joukkueen maalit: pelaaja ID tai AV/YV/TM/RL';
COMMENT ON COLUMN games.opponent_goals IS 'Vastustajan maalit: pelaaja ID tai AV/YV/TM/RL';
COMMENT ON COLUMN games.shots_on_goal IS 'Vedot maalia kohti: pelaaja ID:t';
COMMENT ON COLUMN games.shots_off_target IS 'Vedot ohi maalin: pelaaja ID:t';
COMMENT ON COLUMN games.shots_blocked IS 'Vedot blokkiin: pelaaja ID:t';
COMMENT ON COLUMN games.blocks IS 'Blokkipisteet: pelaaja ID:t';
COMMENT ON COLUMN games.opponent_shots_off IS 'Vastustajan vedot ohi maalin';
COMMENT ON COLUMN games.saves IS 'Torjunnat: pelaaja ID:t';
COMMENT ON COLUMN games.goalie_blocks IS 'Maalivahdin katkot: pelaaja ID:t';
