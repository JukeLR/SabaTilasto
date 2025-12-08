import { sql } from '$lib/db';
import { json, type RequestEvent } from '@sveltejs/kit';

// GET /api/games/[id]/players/[player_id]/stats
export const GET = async ({ params }: RequestEvent) => {
  const gameId = parseInt(params.id || '0');
  const playerId = parseInt(params.player_id || '0');
  if (!gameId || !playerId) {
    return json({ error: 'Virheellinen peli tai pelaaja ID' }, { status: 400 });
  }

  // Hae pelaajan perustiedot
  const playerRes = await sql`
    SELECT id, first_name, last_name, nick, jersey_number, position
    FROM players
    WHERE id = ${playerId}
  `;
  if (playerRes.length === 0) {
    return json({ error: 'Pelaajaa ei löytynyt' }, { status: 404 });
  }
  const player = playerRes[0];

  // Hae player_game_stats-taulun arvot
  let dbStats = [];
  try {
    dbStats = await sql`
      SELECT goals, assists, shots, blocked_shots, missed_shots, takeaways
      FROM player_game_stats
      WHERE game_id = ${gameId} AND player_id = ${playerId}
    `;
  } catch (e) {
    dbStats = [];
  }

  // Hae pelin kentät
  const gameRes = await sql`SELECT team_goals, assists, shots_on_goal, shots_off_target, shots_blocked, blocks, plus_points, minus_points FROM games WHERE id = ${gameId}`;
  const game = gameRes[0] || {};

  // Laske tilastot pelin kentistä
  function countFromArray(arr, id) {
    if (!Array.isArray(arr)) return 0;
    return arr.filter((x) => Number(x) === playerId).length;
  }
  const combinedStats = {
    goals: countFromArray(game.team_goals, playerId),
    assists: countFromArray(game.assists, playerId),
    shots_on_goal: countFromArray(game.shots_on_goal, playerId),
    shots_off_target: countFromArray(game.shots_off_target, playerId),
    shots_blocked: countFromArray(game.shots_blocked, playerId),
    blocks: countFromArray(game.blocks, playerId),
    plus_points: countFromArray(game.plus_points, playerId),
    minus_points: countFromArray(game.minus_points, playerId)
  };

  // Jos player_game_stats-taulussa on arvoja, käytä niitä, muuten käytä pelin kentistä laskettuja
  const stats = dbStats.length > 0 ? dbStats[0] : combinedStats;

  return json({ player, stats });
};
