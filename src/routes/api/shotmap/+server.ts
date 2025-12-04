// src/routes/api/shotmap/+server.ts
import { sql } from '$lib/db';

export async function POST({ request }) {
  const { x, y, player_id, team, type, games_id } = await request.json();
  await sql`INSERT INTO shotmap (x, y, player_id, team, type, games_id) VALUES (${x}, ${y}, ${player_id}, ${team}, ${type}, ${games_id})`;
  return new Response(JSON.stringify({ success: true }));
}