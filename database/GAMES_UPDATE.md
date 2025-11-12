# Games-taulukon päivitys

## Ohjeet

1. Avaa Neon Console: https://console.neon.tech
2. Valitse projektisi
3. Klikkaa "SQL Editor"
4. Kopioi `update_games_table.sql` sisältö editoriin
5. Klikkaa "Run" suorittaaksesi SQL-komennot

## Mitä lisätään

### Uudet sarakkeet:

- **lineup** (INTEGER[]) - Peliin valittujen pelaajien ID:t
- **field_positions** (INTEGER[]) - Kentällisten järjestys (21 paikkaa):
  - [0] = Maalivahti
  - [1-5] = 1. kenttä (3+2)
  - [6-10] = 2. kenttä (3+2)
  - [11-15] = 3. kenttä (3+2)
  - [16-20] = 4. kenttä (3+2)
- **is_played** (BOOLEAN) - Onko peli pelattu (default: false)
- **notes** (TEXT) - Vapaat muistiinpanot pelistä

## Tarkistus

Voit tarkistaa että sarakkeet on lisätty:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games';
```

## Field Positions -rakenne

field_positions arrayn indeksit vastaavat modalin paikkoja:

```
Maalivahti: field_positions[0]

1. kenttä:
  Ylärivi: field_positions[1], field_positions[2], field_positions[3]
  Alarivi: field_positions[4], field_positions[5]

2. kenttä:
  Ylärivi: field_positions[6], field_positions[7], field_positions[8]
  Alarivi: field_positions[9], field_positions[10]

3. kenttä:
  Ylärivi: field_positions[11], field_positions[12], field_positions[13]
  Alarivi: field_positions[14], field_positions[15]

4. kenttä:
  Ylärivi: field_positions[16], field_positions[17], field_positions[18]
  Alarivi: field_positions[19], field_positions[20]
```

NULL-arvot tarkoittavat että kyseisessä paikassa ei ole pelaajaa.
