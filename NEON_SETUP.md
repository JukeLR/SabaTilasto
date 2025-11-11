# SabaTilasto - Neon PostgreSQL -integraatio

## Asennusohjeet

### 1. Luo Neon-tietokanta

1. Mene osoitteeseen https://console.neon.tech
2. Kirjaudu sisään tai luo uusi tili
3. Luo uusi projekti
4. Kopioi **Connection String** Dashboard-näkymästä

### 2. Konfiguroi ympäristömuuttujat

1. Avaa `.env` tiedosto projektin juuressa
2. Korvaa `DATABASE_URL` Neon connection stringillä:

```
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### 3. Luo tietokantataulut

1. Avaa Neon Console (https://console.neon.tech)
2. Valitse projektisi
3. Klikkaa **SQL Editor**
4. Kopioi ja suorita `database/schema.sql` tiedoston sisältö SQL Editorissa
5. Taulukot luodaan automaattisesti

### 4. Käynnistä sovellus

```bash
npm run dev
```

## Sovelluksen ominaisuudet

### Käyttäjähallinta
- **Rekisteröityminen**: `/register`
- **Kirjautuminen**: `/login`
- **Uloskirjautuminen**: Painike pääsivulla

### Pelitilastointi
- Tilastoi pelejä eräkohtaisesti (3 erää)
- Seuraa tilastoja:
  - Maalit
  - Laukaukset (blokkiin, ohi)
  - Torjunnat
  - Moken katkot
- Tallenna pelit tietokantaan
- Katso yhteenveto pelistä

### Tietokantataulut

**users** - Käyttäjätiedot
- id, username, email, password_hash

**games** - Pelit
- id, user_id, opponent_team_name, final_own_score, final_opp_score

**period_stats** - Eräkohtaiset tilastot
- game_id, period_number (1-3)
- Oma joukkue: own_goals, own_blocked_shots, own_missed_shots, own_draws, own_takeaways
- Vastustaja: opp_goals, opp_blocked_shots, opp_missed_shots, opp_draws, opp_takeaways

**teams** - Joukkueet (valinnainen)
- id, name, user_id

**players** - Pelaajat (valinnainen)
- id, team_id, name, jersey_number, position

## API Endpointit

### Autentikaatio
- `POST /api/auth/register` - Rekisteröityminen
- `POST /api/auth/login` - Kirjautuminen
- `POST /api/auth/logout` - Uloskirjautuminen

### Pelit
- `POST /api/games/save` - Tallenna peli
- `GET /api/games` - Hae käyttäjän pelit
- `GET /api/games/[id]` - Hae yksittäinen peli

## Teknologiat

- **Frontend**: SvelteKit 5, TypeScript
- **Backend**: SvelteKit API Routes
- **Tietokanta**: Neon PostgreSQL (serverless)
- **Autentikaatio**: Cookie-pohjainen sessio
- **Salasanat**: bcryptjs

## Turvallisuus

- Salasanat hashataan bcryptjs:llä
- HttpOnly-cookiet session hallintaan
- SQL-injektiosuojaus Neon SQL-clientin kautta
- Käyttäjäkohtainen tietojen eristys
