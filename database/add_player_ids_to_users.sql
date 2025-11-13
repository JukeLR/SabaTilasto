-- Poista vanha player_ids sarake ja lisää se uudelleen oikeilla asetuksilla
-- Tämä mahdollistaa sen, että käyttäjä voi seurata tiettyjä pelaajia

-- Poista sarake jos se on olemassa
ALTER TABLE users 
DROP COLUMN IF EXISTS player_ids;

-- Lisää sarake uudelleen
ALTER TABLE users 
ADD COLUMN player_ids INTEGER[];

-- Lisää kommentti sarakkeelle
COMMENT ON COLUMN users.player_ids IS 'Lista pelaaja ID:istä joita käyttäjä seuraa';
