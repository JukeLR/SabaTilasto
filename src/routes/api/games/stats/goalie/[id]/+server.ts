import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const GET = async ({ params }) => {
  const goalieId = params.id;
  // Hae maalivahdin perustiedot
  const goalieRes = await sql`SELECT id, first_name, last_name FROM players WHERE id = ${goalieId} AND position = 'Maalivahti' LIMIT 1`;
  if (!goalieRes || goalieRes.length === 0) {
    return json({ error: 'Maalivahtia ei löytynyt' }, { status: 404 });
  }
  const goalie = goalieRes[0];

  // Hae kaikki pelit joissa maalivahti on ollut kentällä
  const games = await sql`SELECT * FROM games ORDER BY game_date ASC`;
  // Per peli -data kuvaajia varten
  let savesPerGame: Array<{ date: string; saves: number }> = [];
  let goalsAgainstPerGame: Array<{ date: string; goals: number }> = [];
  let assistsPerGame: Array<{ date: string; assists: number }> = [];
  let interruptionsPerGame: Array<{ date: string; interruptions: number }> = [];
  let turnoverGoalPerGame: Array<{ date: string; turnovers: number }> = [];
  let turnoverNogoalPerGame: Array<{ date: string; turnovers: number }> = [];

  for (const game of games) {
    // Maalivahti on kentällä jos field_positions sisältää goalieId:n tai goalie_change == goalieId
    let goalieInGame = false;
    if (Array.isArray(game.field_positions) && game.field_positions.includes(Number(goalieId))) {
      goalieInGame = true;
    }
    if (game.goalie_change && Number(game.goalie_change) === Number(goalieId)) {
      goalieInGame = true;
    }
    if (!goalieInGame) continue;
    let dateStr = '';
    // Muunna UTC-aika Suomen aikaan (UTC+2/+3) ja ota vain pvm
    function toSuomiDateString(dt: Date | string) {
      let d = typeof dt === 'string' ? new Date(dt) : dt;
      // Lisää 3 tuntia UTC-aikaan (kesäaika, UTC+3)
      d = new Date(d.getTime() + 3 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    }
    if (game.game_date instanceof Date || typeof game.game_date === 'string') {
      dateStr = toSuomiDateString(game.game_date);
    } else {
      dateStr = '' + game.game_date;
    }
    // Torjunnat (saves: integer[])
    let saves = 0;
    if (Array.isArray(game.saves)) {
      saves = game.saves.filter((sid: number) => sid === Number(goalieId)).length;
    }
    savesPerGame.push({ id: game.id, date: dateStr, saves });
    // Päästetyt
    let goals = 0;
    if (Array.isArray(game.opponent_goals)) {
      goals = game.opponent_goals.filter((oid: any) => Number(oid) === Number(goalieId)).length;
    }
    goalsAgainstPerGame.push({ id: game.id, date: dateStr, goals });
    // Syötöt
    let assists = 0;
    if (Array.isArray(game.assists)) {
      assists = game.assists.filter((aid: number) => aid === Number(goalieId)).length;
    }
    assistsPerGame.push({ date: dateStr, assists });
    // Katkot
    let interruptions = 0;
    if (Array.isArray(game.goalie_game_interruption)) {
      interruptions = game.goalie_game_interruption.filter((iid: number) => iid === Number(goalieId)).length;
    }
    interruptionsPerGame.push({ date: dateStr, interruptions });
    // Pelinkäännöt (maali)
    let turnoversGoal = 0;
    if (Array.isArray(game.opponent_turnover_goal)) {
      turnoversGoal = game.opponent_turnover_goal.filter((pid: number) => pid === Number(goalieId)).length;
    }
    turnoverGoalPerGame.push({ date: dateStr, turnovers: turnoversGoal });
    // Pelinkäännöt (ei maalia)
    let turnoversNogoal = 0;
    if (Array.isArray(game.opponent_turnover_nogoal)) {
      turnoversNogoal = game.opponent_turnover_nogoal.filter((aid: number) => aid === Number(goalieId)).length;
    }
    turnoverNogoalPerGame.push({ date: dateStr, turnovers: turnoversNogoal });
  }
  return json({ goalie, savesPerGame, goalsAgainstPerGame, assistsPerGame, interruptionsPerGame, turnoverGoalPerGame, turnoverNogoalPerGame });
};
