-- Päivitä tietokanta joukkueiden hallintaa varten
-- Suorita tämä Neon SQL Editorissa

-- 1. Lisää uudet sarakkeet teams-taulukkoon (jos ei ole jo tehty)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS home_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS age_group VARCHAR(50);

-- 2. Lisää team_ids array-sarake users-taulukkoon
ALTER TABLE users
ADD COLUMN IF NOT EXISTS team_ids INTEGER[];

-- 3. Jos user_teams taulu on olemassa, siirrä data arrayhin
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_teams') THEN
        UPDATE users u
        SET team_ids = ARRAY(
            SELECT team_id FROM user_teams WHERE user_id = u.id
        )
        WHERE EXISTS (SELECT 1 FROM user_teams WHERE user_id = u.id);
        
        -- Poista vanha liitostaulu
        DROP TABLE user_teams;
    END IF;
END $$;

-- 4. Jos vanha team_id sarake on olemassa, siirrä data arrayhin
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'team_id'
    ) THEN
        UPDATE users
        SET team_ids = ARRAY[team_id]
        WHERE team_id IS NOT NULL;
        
        ALTER TABLE users DROP COLUMN team_id;
    END IF;
END $$;

-- 5. Tarkista että muutokset onnistuivat
SELECT 'Teams table:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teams';

SELECT 'Users table:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
