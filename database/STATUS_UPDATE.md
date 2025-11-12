# Game Status Update - Muutokset

## Yhteenveto
Muutettu `is_played` BOOLEAN-sarake `status` VARCHAR-sarakkeeksi, joka tukee kolmea tilaa:
- **Luotu** - Peli on luotu mutta ei aloitettu
- **Käynnissä** - Peli on aloitettu ja tilastointi käynnissä
- **Pelattu** - Peli on pelattu loppuun

## Tietokantamuutokset

### 1. database/update_games_table.sql
- Muutettu: `is_played BOOLEAN DEFAULT false` → `status VARCHAR(20) DEFAULT 'Luotu'`
- Lisätty: CHECK constraint `CHECK (status IN ('Luotu', 'Käynnissä', 'Pelattu'))`

### 2. database/migrate_game_status.sql (UUSI)
- Migraatioskripti olemassa oleville tietokannoille
- Lisää `status`-sarakkeen
- Konvertoi vanhat `is_played`-arvot:
  - `is_played = true` → `status = 'Pelattu'`
  - `is_played = false` → `status = 'Luotu'`
- Poistaa vanhan `is_played`-sarakkeen

## API-muutokset

### 1. POST /api/games
- Vastaanottaa: `status` (string) isPlayed (boolean) sijaan
- Oletusarvo: `'Luotu'`
- Lisää validointi kolmelle hyväksytylle arvolle

### 2. GET /api/games/[id]?basic=true
- Palauttaa: `status` `isPlayed` sijaan

### 3. PATCH /api/games/[id] (UUSI)
- Päivittää pelin statuksen
- Body: `{ status: 'Luotu' | 'Käynnissä' | 'Pelattu' }`
- Validoi statuksen
- Päivittää myös `updated_at`-aikaleiman

## Käyttöliittymämuutokset

### 1. src/routes/games/new/+page.svelte
- Lähettää: `status: 'Luotu'` `isPlayed: false` sijaan

### 2. src/routes/games/+page.svelte
- Kolme erillistä taulukkoa:
  1. **Luotu** - Näyttää "Näytä" ja "Aloita tilastointi" -napit
  2. **Käynnissä** - Näyttää "Näytä" ja "Jatka tilastointia" -napit (keltainen)
  3. **Pelattu** - Näyttää vain "Näytä" -napin

- Toiminnot:
  - `createdGames` - Suodattaa pelit joiden status = 'Luotu'
  - `ongoingGames` - Suodattaa pelit joiden status = 'Käynnissä'
  - `completedGames` - Suodattaa pelit joiden status = 'Pelattu'

- Tyylit:
  - `.btn-start` - Vihreä (Aloita tilastointi)
  - `.btn-continue` - Keltainen (Jatka tilastointia)
  - `.btn-view` - Harmaa (Näytä)

### 3. src/routes/games/[id]/start/+page.svelte
- `startGame()` kutsuu PATCH-endpointia asettaen statuksen 'Käynnissä'
- Ohjaa sitten tilastointisivulle `/?game=${gameId}`

## Tietokannan päivitysohjeet

Jos games-taulukko on jo olemassa:
```bash
# Suorita Neon SQL Editorissa
database/migrate_game_status.sql
```

Jos luot uuden taulukon:
```bash
# Suorita Neon SQL Editorissa
database/update_games_table.sql
```

## Testausohje

1. Luo uusi peli → Status: "Luotu"
2. Pelit-sivulla näkyy "Luotu"-taulukossa
3. Klikkaa "Aloita tilastointi" → Status muuttuu: "Käynnissä"
4. Pelit-sivulla siirtyy "Käynnissä"-taulukkoon
5. Pelin valmistuttua status päivitetään: "Pelattu"
6. Pelit-sivulla siirtyy "Pelattu"-taulukkoon
