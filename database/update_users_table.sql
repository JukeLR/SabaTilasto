-- Päivitä olemassa oleva users-taulu
-- Suorita tämä Neon SQL Editorissa jos taulussasi ei ole first_name ja last_name kenttiä

-- Lisää first_name ja last_name kentät jos niitä ei ole
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Jos sinulla on password_hash sarake ja haluat käyttää password-nimeä,
-- voit uudelleennimetä sen (VALINNAINEN, älä suorita jos sarake on jo nimeltään "password"):
-- ALTER TABLE users RENAME COLUMN password_hash TO password;

-- Varmista että role-sarake on olemassa
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
