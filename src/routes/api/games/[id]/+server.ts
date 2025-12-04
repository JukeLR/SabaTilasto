import { json, type RequestEvent } from '@sveltejs/kit';
import { getGameWithStats } from '$lib/game-stats';
import { sql } from '$lib/db';

export const GET = async ({ params, cookies, url }: RequestEvent) => {
	try {
		const gameId = parseInt(params.id || '0');
		if (!gameId) {
			return json({ error: 'Virheellinen peli ID' }, { status: 400 });
		}

		const games = await sql`
			SELECT 
				g.id,
				g.series_id,
				g.own_team_id,
				g.opponent_team_name as "opponentName",
				g.game_location as "gameLocation",
				g.game_date as "gameDate",
				g.lineup,
				g.field_positions as "fieldPositions",
				g.status,
				g.notes,
				g.created_at as "createdAt",
				g.team_goals,
				g.opponent_goals,
				g.assists,
				g.shots_on_goal,
				g.shots_off_target,
				g.shots_blocked,
				g.blocks,
				g.saves,
				g.goalie_game_interruption,
				g.opponent_shots_off,
				g.goalie_long_pass,
				g.goalie_short_pass,
				g.goalie_turnover,
				g.plus_points,
				g.minus_points,
				t.name as "ownTeamName"
			FROM games g
			LEFT JOIN teams t ON g.own_team_id = t.id
			WHERE g.id = ${gameId}
		`;

		if (games.length === 0) {
			return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
		}

		const game = games[0];
		// Poistetaan debug-tulostukset
		// console.log('plus_points raw:', game.plus_points);
		// console.log('minus_points raw:', game.minus_points);
		// Varmista että tilastokentät ovat aina array
		game.team_goals = Array.isArray(game.team_goals) ? game.team_goals : (game.team_goals ? [game.team_goals] : []);
		game.opponent_goals = Array.isArray(game.opponent_goals) ? game.opponent_goals : (game.opponent_goals ? [game.opponent_goals] : []);
		game.assists = Array.isArray(game.assists) ? game.assists : (game.assists ? [game.assists] : []);
		game.shots_on_goal = Array.isArray(game.shots_on_goal) ? game.shots_on_goal : (game.shots_on_goal ? [game.shots_on_goal] : []);
		game.shots_off_target = Array.isArray(game.shots_off_target) ? game.shots_off_target : (game.shots_off_target ? [game.shots_off_target] : []);
		game.shots_blocked = Array.isArray(game.shots_blocked) ? game.shots_blocked : (game.shots_blocked ? [game.shots_blocked] : []);
		game.blocks = Array.isArray(game.blocks) ? game.blocks : (game.blocks ? [game.blocks] : []);
		game.saves = Array.isArray(game.saves) ? game.saves : (game.saves ? [game.saves] : []);
		game.goalie_game_interruption = Array.isArray(game.goalie_game_interruption) ? game.goalie_game_interruption : (game.goalie_game_interruption ? [game.goalie_game_interruption] : []);

		// Parse plus_points and minus_points from string to array if needed
		function parsePgArray(val) {
			if (Array.isArray(val)) return val;
			if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
				return val.slice(1, -1).split(',').map(x => Number(x.trim())).filter(x => !isNaN(x));
			}
			if (val == null) return [];
			return [val];
		}
		game.plus_points = parsePgArray(game.plus_points);
		game.minus_points = parsePgArray(game.minus_points);
		game.goalie_long_pass = Array.isArray(game.goalie_long_pass) ? game.goalie_long_pass : (game.goalie_long_pass ? [game.goalie_long_pass] : []);
		game.goalie_short_pass = Array.isArray(game.goalie_short_pass) ? game.goalie_short_pass : (game.goalie_short_pass ? [game.goalie_short_pass] : []);
		game.goalie_turnover = Array.isArray(game.goalie_turnover) ? game.goalie_turnover : (game.goalie_turnover ? [game.goalie_turnover] : []);
		game.opponent_shots_off = typeof game.opponent_shots_off === 'number' ? game.opponent_shots_off : 0;
		// Pakota arrayt serialisoitumaan oikein
		game.plus_points = Array.isArray(game.plus_points)
          ? [...game.plus_points]
          : typeof game.plus_points === 'string'
            ? game.plus_points.replace(/[{}]/g, '').split(',').map(Number)
            : [];

        game.minus_points = Array.isArray(game.minus_points)
          ? [...game.minus_points]
          : typeof game.minus_points === 'string'
            ? game.minus_points.replace(/[{}]/g, '').split(',').map(Number)
            : [];
		return json(game);
	} catch (error) {
		console.error('Get game error:', error);
		return json({ error: 'Pelin haku epäonnistui' }, { status: 500 });
	}
};

export const PUT = async ({ params, request }: RequestEvent) => {
	const gameId = parseInt(params.id || '0');
	if (!gameId) {
		return json({ error: 'Virheellinen peli ID' }, { status: 400 });
	}
	const body = await request.json();
	console.log('PUT payload:', body);
	// Päivitä field_positions, lineup, ownTeamId, opponentName
	// Hae nykyinen goalie_change
	const result = await sql`
		UPDATE games
		SET
			field_positions = ${body.fieldPositions},
			lineup = ${body.lineup},
			own_team_id = ${body.ownTeamId},
			opponent_team_name = ${body.opponentName},
			updated_at = NOW()
		WHERE id = ${gameId}
		RETURNING id
	`;
	if (result.length === 0) {
		return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
	}
	return json({ success: true, id: result[0].id, opponentName: body.opponentName });
};
export const PATCH = async ({ params, request }: RequestEvent) => {
	const gameId = parseInt(params.id || '0');
	if (!gameId) {
		return json({ error: 'Virheellinen peli ID' }, { status: 400 });
	}

		const body = await request.json();
		console.log('PATCH payload:', body);
		const isPolling = body._fromPolling === true;
		if ('goalie_change' in body && (body.goalie_change === null || body.goalie_change === undefined || body.goalie_change === 0)) {
			delete body.goalie_change;
		}

	// Hae nykyiset pelitiedot tietokannasta
	const gameRes = await sql`
		SELECT 
			g.id,
			g.series_id,
			g.own_team_id,
			g.opponent_team_name as "opponentName",
			g.game_location as "gameLocation",
			g.game_date as "gameDate",
			g.lineup,
			g.field_positions as "fieldPositions",
			g.status,
			g.notes,
			g.created_at as "createdAt",
			g.team_goals,
			g.opponent_goals,
			g.assists,
			g.shots_on_goal,
			g.shots_off_target,
			g.shots_blocked,
			g.blocks,
			g.saves,
			g.goalie_game_interruption,
			g.opponent_shots_off
            ,g.plus_points
            ,g.minus_points
		FROM games g
		WHERE g.id = ${gameId}
	`;
	if (gameRes.length === 0) {
		return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
	}
	const currentGame = gameRes[0];
	// Varmista että assists on aina array
	currentGame.assists = Array.isArray(currentGame.assists) ? currentGame.assists : (currentGame.assists ? [currentGame.assists] : []);

	const updateFields: any = {};

	// Tarkista ja lisää päivitettävät kentät
		if (
			body.goalie_change !== undefined &&
			body.goalie_change !== null &&
			typeof body.goalie_change === 'number' &&
			body.goalie_change > 0
		) {
			updateFields.goalie_change = body.goalie_change;
		}
		if (body.fieldPositions !== undefined) {
			updateFields.field_positions = body.fieldPositions;
		}
		if (body.lineup !== undefined) {
			updateFields.lineup = body.lineup;
		}
	if (body.opponentName !== undefined) {
		updateFields.opponent_team_name = body.opponentName;
	}
	if (body.shots_blocked !== undefined) {
		updateFields.shots_blocked = isPolling ? body.shots_blocked : [...(Array.isArray(currentGame.shots_blocked) ? currentGame.shots_blocked : []), ...(Array.isArray(body.shots_blocked) ? body.shots_blocked : [body.shots_blocked])];
	}
	if (body.shots_off_target !== undefined) {
		updateFields.shots_off_target = isPolling ? body.shots_off_target : [...(Array.isArray(currentGame.shots_off_target) ? currentGame.shots_off_target : []), ...(Array.isArray(body.shots_off_target) ? body.shots_off_target : [body.shots_off_target])];
	}
	// Jos pollingista (desktop-stats), korvaa arrayt suoraan
	// (Poistettu duplikaatti isPolling-määrittely)
	if (body.plus_points !== undefined) {
		updateFields.plus_points = isPolling ? body.plus_points : [...(Array.isArray(currentGame.plus_points) ? currentGame.plus_points : []), ...body.plus_points];
	}
	if (body.minus_points !== undefined) {
		updateFields.minus_points = isPolling ? body.minus_points : [...(Array.isArray(currentGame.minus_points) ? currentGame.minus_points : []), ...body.minus_points];
	}
	if (body.team_goals !== undefined) {
		updateFields.team_goals = isPolling ? body.team_goals : [...(Array.isArray(currentGame.team_goals) ? currentGame.team_goals : []), ...(Array.isArray(body.team_goals) ? body.team_goals : [body.team_goals])];
	}
	if (body.assists !== undefined) {
		updateFields.assists = isPolling ? body.assists : [...(Array.isArray(currentGame.assists) ? currentGame.assists : []), ...(Array.isArray(body.assists) ? body.assists : [body.assists])];
	}
	if (body.opponent_goals !== undefined) {
		updateFields.opponent_goals = isPolling ? body.opponent_goals : [...(Array.isArray(currentGame.opponent_goals) ? currentGame.opponent_goals : []), ...(Array.isArray(body.opponent_goals) ? body.opponent_goals : [body.opponent_goals])];
	}
	if (body.shots_on_goal !== undefined) {
		updateFields.shots_on_goal = isPolling ? body.shots_on_goal : [...(Array.isArray(currentGame.shots_on_goal) ? currentGame.shots_on_goal : []), ...(Array.isArray(body.shots_on_goal) ? body.shots_on_goal : [body.shots_on_goal])];
	}
	if (body.saves !== undefined) {
		updateFields.saves = isPolling ? body.saves : [...(Array.isArray(currentGame.saves) ? currentGame.saves : []), ...(Array.isArray(body.saves) ? body.saves : [body.saves])];
	}
	if (body.goalie_long_pass !== undefined) {
		updateFields.goalie_long_pass = isPolling ? body.goalie_long_pass : [...(Array.isArray(currentGame.goalie_long_pass) ? currentGame.goalie_long_pass : []), ...(Array.isArray(body.goalie_long_pass) ? body.goalie_long_pass : [body.goalie_long_pass])];
	}
	if (body.goalie_short_pass !== undefined) {
		updateFields.goalie_short_pass = isPolling ? body.goalie_short_pass : [...(Array.isArray(currentGame.goalie_short_pass) ? currentGame.goalie_short_pass : []), ...(Array.isArray(body.goalie_short_pass) ? body.goalie_short_pass : [body.goalie_short_pass])];
	}
	if (body.goalie_turnover !== undefined) {
		updateFields.goalie_turnover = isPolling ? body.goalie_turnover : [...(Array.isArray(currentGame.goalie_turnover) ? currentGame.goalie_turnover : []), ...(Array.isArray(body.goalie_turnover) ? body.goalie_turnover : [body.goalie_turnover])];
	}
	if (body.goalie_game_interruption !== undefined) {
		updateFields.goalie_game_interruption = isPolling ? body.goalie_game_interruption : [...(Array.isArray(currentGame.goalie_game_interruption) ? currentGame.goalie_game_interruption : []), ...(Array.isArray(body.goalie_game_interruption) ? body.goalie_game_interruption : [body.goalie_game_interruption])];
	}
	if (body.blocks !== undefined) {
		updateFields.blocks = isPolling ? body.blocks : [...(Array.isArray(currentGame.blocks) ? currentGame.blocks : []), ...(Array.isArray(body.blocks) ? body.blocks : [body.blocks])];
	}
	if (body.opponent_shots_off !== undefined) {
		// Jos body.opponent_shots_off on numero, kasvatetaan arvoa yhdellä
		const currentOpponentShotsOff = typeof currentGame.opponent_shots_off === 'number' ? currentGame.opponent_shots_off : 0;
		updateFields.opponent_shots_off = isPolling ? body.opponent_shots_off : currentOpponentShotsOff + Number(body.opponent_shots_off);
	}
	if (body.goal_type !== undefined) {
		updateFields.goal_type = isPolling ? body.goal_type : [...(Array.isArray(currentGame.goal_type) ? currentGame.goal_type : []), body.goal_type];
	}
	if (body.status) {
		updateFields.status = body.status;
	}

	// Jos ei päivitettäviä kenttiä
	if (Object.keys(updateFields).length === 0) {
		return json({ error: 'Ei päivitettäviä kenttiä' }, { status: 400 });
	}

	// Rakenna SQL-päivitys
	// Päivitä kentät suoraan SQL:ssä
	const result = await sql`
		UPDATE games
		SET
			plus_points = ${updateFields.plus_points !== undefined ? updateFields.plus_points : currentGame.plus_points},
			minus_points = ${updateFields.minus_points !== undefined ? updateFields.minus_points : currentGame.minus_points},
			team_goals = ${updateFields.team_goals !== undefined ? updateFields.team_goals : currentGame.team_goals},
			opponent_goals = ${updateFields.opponent_goals !== undefined ? updateFields.opponent_goals : currentGame.opponent_goals},
			shots_on_goal = ${updateFields.shots_on_goal !== undefined ? updateFields.shots_on_goal : currentGame.shots_on_goal},
			shots_off_target = ${updateFields.shots_off_target !== undefined ? updateFields.shots_off_target : currentGame.shots_off_target},
			shots_blocked = ${updateFields.shots_blocked !== undefined ? updateFields.shots_blocked : currentGame.shots_blocked},
			blocks = ${updateFields.blocks !== undefined ? updateFields.blocks : currentGame.blocks},
			opponent_shots_off = ${typeof updateFields.opponent_shots_off === 'number' ? updateFields.opponent_shots_off : currentGame.opponent_shots_off},
			saves = ${updateFields.saves !== undefined ? updateFields.saves : currentGame.saves},
			goalie_game_interruption = ${updateFields.goalie_game_interruption !== undefined ? updateFields.goalie_game_interruption : currentGame.goalie_game_interruption},
			goalie_long_pass = ${updateFields.goalie_long_pass !== undefined ? updateFields.goalie_long_pass : currentGame.goalie_long_pass},
			goalie_short_pass = ${updateFields.goalie_short_pass !== undefined ? updateFields.goalie_short_pass : currentGame.goalie_short_pass},
			goalie_turnover = ${updateFields.goalie_turnover !== undefined ? updateFields.goalie_turnover : currentGame.goalie_turnover},			
			assists = ${updateFields.assists !== undefined ? updateFields.assists : currentGame.assists},
			status = ${updateFields.status !== undefined ? updateFields.status : currentGame.status},
			opponent_team_name = ${updateFields.opponent_team_name !== undefined ? updateFields.opponent_team_name : currentGame.opponentName},
			/* goalie_change poistettu, ei käytössä eikä kannassa */
			field_positions = ${updateFields.field_positions !== undefined ? updateFields.field_positions : currentGame.fieldPositions},
			lineup = ${updateFields.lineup !== undefined ? updateFields.lineup : currentGame.lineup},
			updated_at = NOW()
		WHERE id = ${gameId}
		RETURNING id
	`;
	console.log('PATCH updateFields:', updateFields);
	console.log('PATCH SQL result:', result);
	return json({ success: true, message: 'Peli päivitetty', updated: Object.keys(updateFields) });
};
