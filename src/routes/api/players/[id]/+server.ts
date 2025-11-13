import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const GET = async ({ params }: RequestEvent) => {
  const playerId = parseInt(params.id || '0');
  if (!playerId) {
    return json({ error: 'Virheellinen pelaaja ID' }, { status: 400 });
  }
  const result = await sql`
    SELECT id, nick, first_name, last_name, jersey_number, position FROM players WHERE id = ${playerId}
  `;
  if (!result[0]) {
    return json({ error: 'Pelaajaa ei löytynyt' }, { status: 404 });
  }
  return json(result[0]);
};
