import type { PageServerLoad } from './$types';
import { sql } from '$lib/db';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  const playerId = params.id;
  const user = locals.user;
  if (user?.role === 'pelaaja') {
    // Jos käyttäjä on pelaaja, sallitaan vain omat id:t
    const playerIds = Array.isArray(user.player_ids) ? user.player_ids.map(String) : [];
    if (!playerIds.includes(String(playerId))) {
      throw redirect(303, '/');
    }
  }
  let playerName = 'Tuntematon pelaaja';
  let goalsPerGame: Array<{ date: string; goals: number }> = [];
  let assistsPerGame: Array<{ date: string; assists: number }> = [];
  let shotsOnGoalPerGame: Array<{ date: string; shots: number }> = [];
  let shotsOffTargetPerGame: Array<{ date: string; shots: number }> = [];
  let shotsBlockedPerGame: Array<{ date: string; shots: number }> = [];
  let blocksPerGame: Array<{ date: string; blocks: number }> = [];
  let teamTurnoverGoalPerGame: Array<{ date: string; turnovers: number }> = [];
  let teamTurnoverNogoalPerGame: Array<{ date: string; turnovers: number }> = [];
  let opponentTurnoverGoalPerGame: Array<{ date: string; turnovers: number }> = [];
  let opponentTurnoverNogoalPerGame: Array<{ date: string; turnovers: number }> = [];
  let debugData: any[] = [];
          
  try {
    // Hae pelaajan nimi
    const result = await sql`SELECT first_name, last_name FROM players WHERE id = ${playerId} LIMIT 1`;
    if (result && result.length > 0) {
      playerName = `${result[0].first_name} ${result[0].last_name}`;
    }
    // Hae pelit joissa pelaaja on ollut kentällä
    // Palautetaan kaikki pelit debuggausta varten
    const games = await sql`SELECT id, game_date, team_goals, assists, shots_on_goal, shots_off_target, shots_blocked, blocks, team_turnover_goal, team_turnover_nogoal, opponent_turnover_goal, field_positions FROM games ORDER BY game_date ASC`;
                              
    for (const game of games) {
        // Pelinkäännöt vastustajalle ilman maalia
        let opponentTurnoversNogoal = 0;
        let opponentTurnoversNogoalArr: any[] = [];
        if (Array.isArray(game.opponent_turnover_nogoal)) {
        opponentTurnoversNogoalArr = game.opponent_turnover_nogoal;
        } else if (typeof game.opponent_turnover_nogoal === 'string') {
        try {
            const arr = JSON.parse(game.opponent_turnover_nogoal);
            if (Array.isArray(arr)) opponentTurnoversNogoalArr = arr;
        } catch {}
        }
        const opponentTurnoversNogoalMatches = opponentTurnoversNogoalArr.filter((tid: any) => parseInt(tid) === Number(playerId));
        opponentTurnoversNogoal = opponentTurnoversNogoalMatches.length;
        // Pelinkäännöt vastustajalle maalilla
        let opponentTurnoversGoal = 0;
        let opponentTurnoversGoalArr: any[] = [];
        if (Array.isArray(game.opponent_turnover_goal)) {
        opponentTurnoversGoalArr = game.opponent_turnover_goal;
        } else if (typeof game.opponent_turnover_goal === 'string') {
        try {
            const arr = JSON.parse(game.opponent_turnover_goal);
            if (Array.isArray(arr)) opponentTurnoversGoalArr = arr;
        } catch {}
        }
        const opponentTurnoversGoalMatches = opponentTurnoversGoalArr.filter((tid: any) => parseInt(tid) === Number(playerId));
        opponentTurnoversGoal = opponentTurnoversGoalMatches.length;

        // Pelinkäännöt ilman maalia
        let turnoversNoGoal = 0;
        let turnoversNoGoalArr: any[] = [];
        if (Array.isArray(game.team_turnover_nogoal)) {
        turnoversNoGoalArr = game.team_turnover_nogoal;
        } else if (typeof game.team_turnover_nogoal === 'string') {
        try {
            const arr = JSON.parse(game.team_turnover_nogoal);
            if (Array.isArray(arr)) turnoversNoGoalArr = arr;
        } catch {}
        }
        const turnoversNoGoalMatches = turnoversNoGoalArr.filter((tid: any) => parseInt(tid) === Number(playerId));
        turnoversNoGoal = turnoversNoGoalMatches.length;

        // Pelinkäännöt maalilla
        let turnovers = 0;
        let turnoversArr: any[] = [];
        if (Array.isArray(game.team_turnover_goal)) {
            turnoversArr = game.team_turnover_goal;
        } else if (typeof game.team_turnover_goal === 'string') {
            try {
            const arr = JSON.parse(game.team_turnover_goal);
            if (Array.isArray(arr)) turnoversArr = arr;
            } catch {}
        }
        const turnoversMatches = turnoversArr.filter((tid: any) => parseInt(tid) === Number(playerId));
        turnovers = turnoversMatches.length;
         
        // Vastustajan vetojen blokkaukset
        let blocks = 0;
        let blocksArr: any[] = [];
        if (Array.isArray(game.blocks)) {
          blocksArr = game.blocks;
        } else if (typeof game.blocks === 'string') {
          try {
            const arr = JSON.parse(game.blocks);
            if (Array.isArray(arr)) blocksArr = arr;
          } catch {}
        }
        const blocksMatches = blocksArr.filter((bid: any) => parseInt(bid) === Number(playerId));
        blocks = blocksMatches.length;

        // Vedot blokkiin
        let shotsBlocked = 0;
        let shotsBlockedArr: any[] = [];
        if (Array.isArray(game.shots_blocked)) {
        shotsBlockedArr = game.shots_blocked;
        } else if (typeof game.shots_blocked === 'string') {
        try {
            const arr = JSON.parse(game.shots_blocked);
            if (Array.isArray(arr)) shotsBlockedArr = arr;
        } catch {}
        }
        const shotsBlockedMatches = shotsBlockedArr.filter((sid: any) => parseInt(sid) === Number(playerId));
        shotsBlocked = shotsBlockedMatches.length;

        // Vedot maalin ohi
        let shotsOff = 0;
        let shotsOffArr: any[] = [];
        if (Array.isArray(game.shots_off_target)) {
        shotsOffArr = game.shots_off_target;
        } else if (typeof game.shots_off_target === 'string') {
        try {
            const arr = JSON.parse(game.shots_off_target);
            if (Array.isArray(arr)) shotsOffArr = arr;
        } catch {}
        }
        const shotsOffMatches = shotsOffArr.filter((sid: any) => parseInt(sid) === Number(playerId));
        shotsOff = shotsOffMatches.length;

        // Vedot maalia kohti
        let shots = 0;
        let shotsArr: any[] = [];
        if (Array.isArray(game.shots_on_goal)) {
            shotsArr = game.shots_on_goal;
        } else if (typeof game.shots_on_goal === 'string') {
            try {
            const arr = JSON.parse(game.shots_on_goal);
            if (Array.isArray(arr)) shotsArr = arr;
            } catch {}
        }
        const shotsMatches = shotsArr.filter((sid: any) => parseInt(sid) === Number(playerId));
        shots = shotsMatches.length;

        // Maalit
        let goals = 0;
        let teamGoalsArr: any[] = [];
        if (Array.isArray(game.team_goals)) {
            teamGoalsArr = game.team_goals;
        } else if (typeof game.team_goals === 'string') {
            try {
            const arr = JSON.parse(game.team_goals);
            if (Array.isArray(arr)) teamGoalsArr = arr;
            } catch {}
        }

        // Syötöt
        let assists = 0;
        let assistsArr: any[] = [];
        if (Array.isArray(game.assists)) {
            assistsArr = game.assists;
        } else if (typeof game.assists === 'string') {
            try {
            const arr = JSON.parse(game.assists);
            if (Array.isArray(arr)) assistsArr = arr;
            } catch {}
        }   
        
        const fieldPositionsArr = Array.isArray(game.field_positions) ? game.field_positions : [];
        const playerInField = fieldPositionsArr.includes(Number(playerId));
        const goalMatches = teamGoalsArr.filter((gid: any) => parseInt(gid) === Number(playerId));
        goals = goalMatches.length;
        const assistMatches = assistsArr.filter((aid: any) => parseInt(aid) === Number(playerId));
        assists = assistMatches.length;
        debugData.push({
          gameId: game.id,
          date: game.game_date,
          fieldPositionsArr,
          playerInField,
          teamGoalsArr,
          assistsArr,
          shotsArr,
          shotsOffArr,
          shotsBlockedArr,
          blocksArr,
          playerId,
          goalMatches,
          assistMatches,
          shotsMatches,
          shotsOffMatches,
          shotsBlockedMatches,
          blocksMatches,
          turnoversArr,
          turnoversMatches,
          turnoversNoGoalArr,
          turnoversNoGoalMatches,
          opponentTurnoversGoalArr,
          opponentTurnoversGoalMatches,
          opponentTurnoversNogoalArr,
          opponentTurnoversNogoalMatches,
          goals,
          assists,
          shots,
          shotsOff,
          shotsBlocked,
          blocks,
          turnovers,
          turnoversNoGoal,
          opponentTurnoversGoal,
          opponentTurnoversNogoal
        });
        if (playerInField) {
            let dateStr = '';
            if (game.game_date instanceof Date) {
            dateStr = game.game_date.toISOString().slice(0, 10);
            } else if (typeof game.game_date === 'string') {
            dateStr = game.game_date.slice(0, 10);
            } else {
            dateStr = '' + game.game_date;
            }
            goalsPerGame.push({ date: dateStr, goals });
            assistsPerGame.push({ date: dateStr, assists });
            shotsOnGoalPerGame.push({ date: dateStr, shots });
            shotsOffTargetPerGame.push({ date: dateStr, shots: shotsOff });
            shotsBlockedPerGame.push({ date: dateStr, shots: shotsBlocked });
            blocksPerGame.push({ date: dateStr, blocks });
            teamTurnoverGoalPerGame.push({ date: dateStr, turnovers });
            teamTurnoverNogoalPerGame.push({ date: dateStr, turnovers: turnoversNoGoal });
            opponentTurnoverGoalPerGame.push({ date: dateStr, turnovers: opponentTurnoversGoal });
            opponentTurnoverNogoalPerGame.push({ date: dateStr, turnovers: opponentTurnoversNogoal });
        }
    }
  } catch (e) {
    // ignore
  }
  return { playerName, goalsPerGame, assistsPerGame, shotsOnGoalPerGame, shotsOffTargetPerGame, shotsBlockedPerGame, blocksPerGame, teamTurnoverGoalPerGame, teamTurnoverNogoalPerGame, opponentTurnoverGoalPerGame, opponentTurnoverNogoalPerGame, debugData };
};
