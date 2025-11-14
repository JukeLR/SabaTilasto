import { sql } from '$lib/db';
import { json, type RequestEvent } from '@sveltejs/kit';

export const GET = async ({ params }: RequestEvent) => {
  const gameId = parseInt(params.id || '0');
  if (!gameId) {
    return json({ error: 'Virheellinen peli ID' }, { status: 400 });
  }

  // Hae field_positions ja pelaajat
  const gameRes = await sql`SELECT field_positions FROM games WHERE id = ${gameId}`;
  if (gameRes.length === 0) {
    return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
  }
  const fieldPositions = gameRes[0].field_positions || [];
  if (!Array.isArray(fieldPositions) || fieldPositions.length === 0) {
    return json({ players: [] });
  }

  // Hae pelaajien nimet
  const playersRes = await sql`
    SELECT id, first_name, last_name
    FROM players
    WHERE id = ANY(${fieldPositions})
    ORDER BY last_name ASC
  `;

  return json({ players: playersRes });
};
