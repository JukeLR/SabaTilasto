-- Migratoi games-taulukko käyttämään status-saraketta is_played-sarakkeen sijaan
-- Suorita tämä Neon SQL Editorissa

-- Lisää uusi status-sarake
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Luotu' 
CHECK (status IN ('Luotu', 'Käynnissä', 'Pelattu'));

-- Päivitä olemassa olevat rivit (jos is_played-sarake on olemassa)
-- Jos is_played = true, aseta status = 'Pelattu'
-- Jos is_played = false, aseta status = 'Luotu'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'games' AND column_name = 'is_played'
    ) THEN
        UPDATE games 
        SET status = CASE 
            WHEN is_played = true THEN 'Pelattu'
            ELSE 'Luotu'
        END;
        
        -- Poista vanha is_played-sarake
        ALTER TABLE games DROP COLUMN is_played;
    END IF;
END $$;
