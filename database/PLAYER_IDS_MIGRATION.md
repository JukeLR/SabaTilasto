# Users-taulun player_ids-sarakkeen lisäys

## Muutokset

Lisätään `users`-taulukkoon uusi sarake `player_ids`, joka mahdollistaa käyttäjän seuraamien pelaajien tallentamisen.

## Sarake

- **player_ids**: `INTEGER[]` - Array pelaaja-ID:istä
  - Oletusarvo: tyhjä array `{}`
  - Käyttäjä voi lisätä tähän haluamiensa pelaajien ID:t seurantaa varten

## Migraation suoritus

### Neon Console -kautta

1. Kirjaudu [Neon Console](https://console.neon.tech)
2. Valitse projektisi
3. Avaa **SQL Editor**
4. Kopioi ja suorita `database/add_player_ids_to_users.sql` tiedoston sisältö

### Komentoriviltä (jos käytät psql)

```bash
psql $DATABASE_URL -f database/add_player_ids_to_users.sql
```

## Käyttöesimerkit

### Lisää pelaaja seurantaan
```sql
UPDATE users 
SET player_ids = array_append(player_ids, 123)
WHERE id = 1;
```

### Poista pelaaja seurannasta
```sql
UPDATE users 
SET player_ids = array_remove(player_ids, 123)
WHERE id = 1;
```

### Aseta useita pelaajia kerralla
```sql
UPDATE users 
SET player_ids = ARRAY[123, 456, 789]
WHERE id = 1;
```

### Hae käyttäjän seuraamat pelaajat
```sql
SELECT p.* 
FROM players p
WHERE p.id = ANY(
  SELECT player_ids FROM users WHERE id = 1
);
```

## API-esimerkit (tulevaisuutta varten)

### GET /api/auth/profile
Palauttaa nyt myös `player_ids`:
```json
{
  "id": 1,
  "username": "käyttäjä",
  "email": "email@example.com",
  "role": "pelaaja",
  "player_ids": [123, 456]
}
```

### PATCH /api/auth/profile
Voi päivittää `player_ids`:
```json
{
  "player_ids": [123, 456, 789]
}
```
