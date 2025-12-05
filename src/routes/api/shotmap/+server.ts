// src/routes/api/shotmap/+server.ts

import { sql } from '$lib/db';

export async function POST({ request }) {
  const { x, y, player_id, team, type, games_id } = await request.json();
  await sql`INSERT INTO shotmap (x, y, player_id, team, type, games_id) VALUES (${x}, ${y}, ${player_id}, ${team}, ${type}, ${games_id})`;
  return new Response(JSON.stringify({ success: true }));
}

export async function GET({ url }) {
  const games_id = url.searchParams.get('games_id');
  if (!games_id) {
    return new Response(JSON.stringify([]), { status: 400 });
  }
  // Hae pisteet Neonista
  const rows = await sql`SELECT x, y, player_id, team, type, games_id FROM shotmap WHERE games_id = ${games_id}`;
  return new Response(JSON.stringify(rows), { status: 200 });
}
