// src/routes/api/shotmap/+server.ts

import { sql } from '$lib/db';

export async function POST({ request }) {
  const { x, y, player_id, team, type, games_id } = await request.json();
  await sql`INSERT INTO shotmap (x, y, player_id, team, type, games_id) VALUES (${x}, ${y}, ${player_id}, ${team}, ${type}, ${games_id})`;
  return new Response(JSON.stringify({ success: true }));
}

export async function GET({ url }) {
  // Kerää kaikki games_id-parametrit (voi olla useita)
  const gamesIdParams = url.searchParams.getAll('games_id');
  if (!gamesIdParams || gamesIdParams.length === 0) {
    return new Response(JSON.stringify([]), { status: 400 });
  }
  // Muunna numeroksi ja suodata duplikaatit
  const gamesIds = [...new Set(gamesIdParams.map(id => Number(id)).filter(id => !isNaN(id)))];
  if (gamesIds.length === 0) {
    return new Response(JSON.stringify([]), { status: 400 });
  }
  // Hae pisteet Neonista ANY-lauseella (JS-taulukko parametrina)
  const rows = await sql`SELECT x, y, player_id, team, type, games_id FROM shotmap WHERE games_id = ANY(${gamesIds})`;
  return new Response(JSON.stringify(rows), { status: 200 });
}
