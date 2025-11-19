export const PUT = async ({ params, request }: RequestEvent) => {
	const gameId = parseInt(params.id || '0');
	if (!gameId) {
		return json({ error: 'Virheellinen peli ID' }, { status: 400 });
	}
	const body = await request.json();
	// Päivitä field_positions, lineup, ownTeamId, opponentName
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
		game.opponent_shots_off = typeof game.opponent_shots_off === 'number' ? game.opponent_shots_off : 0;
		return json(game);
	} catch (error) {
		console.error('Get game error:', error);
		return json({ error: 'Pelin haku epäonnistui' }, { status: 500 });
	}
};

export const PATCH = async ({ params, request }: RequestEvent) => {
	const gameId = parseInt(params.id || '0');
	if (!gameId) {
		return json({ error: 'Virheellinen peli ID' }, { status: 400 });
	}

	const body = await request.json();

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
	if (body.goalie_change !== undefined) {
		updateFields.goalie_change = body.goalie_change;
	}
	if (body.opponentName !== undefined) {
		updateFields.opponent_team_name = body.opponentName;
	}
	if (body.shots_blocked !== undefined) {
		const currentShotsBlocked = Array.isArray(currentGame.shots_blocked) ? currentGame.shots_blocked : [];
		updateFields.shots_blocked = [...currentShotsBlocked, ...(Array.isArray(body.shots_blocked) ? body.shots_blocked : [body.shots_blocked])];
	}
	if (body.shots_off_target !== undefined) {
		const currentShotsOffTarget = Array.isArray(currentGame.shots_off_target) ? currentGame.shots_off_target : [];
		updateFields.shots_off_target = [...currentShotsOffTarget, ...(Array.isArray(body.shots_off_target) ? body.shots_off_target : [body.shots_off_target])];
	}
	if (body.plus_points !== undefined) {
		let currentPlusPoints = currentGame.plus_points;
		// Varmista että plus_points on array myös SQL-tasolla
		if (!Array.isArray(currentPlusPoints)) {
			if (currentPlusPoints == null) currentPlusPoints = [];
			else if (typeof currentPlusPoints === 'string') {
				// Jos string, yritä muuntaa arrayksi
				try {
					currentPlusPoints = JSON.parse(currentPlusPoints);
				} catch {
					currentPlusPoints = [currentPlusPoints];
				}
			} else {
				currentPlusPoints = [currentPlusPoints];
			}
		}
		updateFields.plus_points = [...currentPlusPoints, ...body.plus_points];
		console.log('updateFields.plus_points:', updateFields.plus_points);
	}
	if (body.minus_points !== undefined) {
		const currentMinusPoints = Array.isArray(currentGame.minus_points) ? currentGame.minus_points : [];
		updateFields.minus_points = [...currentMinusPoints, ...body.minus_points];
	}
	if (body.team_goals !== undefined) {
		const currentTeamGoals = Array.isArray(currentGame.team_goals) ? currentGame.team_goals : [];
		updateFields.team_goals = [...currentTeamGoals, ...(Array.isArray(body.team_goals) ? body.team_goals : [body.team_goals])];
	}
	if (body.assists !== undefined) {
		const currentAssists = Array.isArray(currentGame.assists) ? currentGame.assists : [];
		updateFields.assists = [...currentAssists, ...(Array.isArray(body.assists) ? body.assists : [body.assists])];
	}
	if (body.opponent_goals !== undefined) {
		const currentOpponentGoals = Array.isArray(currentGame.opponent_goals) ? currentGame.opponent_goals : [];
		updateFields.opponent_goals = [...currentOpponentGoals, ...(Array.isArray(body.opponent_goals) ? body.opponent_goals : [body.opponent_goals])];
	}
	if (body.shots_on_goal !== undefined) {
		const currentShotsOnGoal = Array.isArray(currentGame.shots_on_goal) ? currentGame.shots_on_goal : [];
		updateFields.shots_on_goal = [...currentShotsOnGoal, ...(Array.isArray(body.shots_on_goal) ? body.shots_on_goal : [body.shots_on_goal])];
	}
	if (body.saves !== undefined) {
		const currentSaves = Array.isArray(currentGame.saves) ? currentGame.saves : [];
		updateFields.saves = [...currentSaves, ...(Array.isArray(body.saves) ? body.saves : [body.saves])];
	}
	if (body.goalie_game_interruption !== undefined) {
		const currentGoalieGameInterruption = Array.isArray(currentGame.goalie_game_interruption) ? currentGame.goalie_game_interruption : [];
		updateFields.goalie_game_interruption = [...currentGoalieGameInterruption, ...(Array.isArray(body.goalie_game_interruption) ? body.goalie_game_interruption : [body.goalie_game_interruption])];
	}
	if (body.blocks !== undefined) {
		const currentBlocks = Array.isArray(currentGame.blocks) ? currentGame.blocks : [];
		updateFields.blocks = [...currentBlocks, ...(Array.isArray(body.blocks) ? body.blocks : [body.blocks])];
	}
	if (body.opponent_shots_off !== undefined) {
		// Jos body.opponent_shots_off on numero, kasvatetaan arvoa yhdellä
		const currentOpponentShotsOff = typeof currentGame.opponent_shots_off === 'number' ? currentGame.opponent_shots_off : 0;
		updateFields.opponent_shots_off = currentOpponentShotsOff + Number(body.opponent_shots_off);
	}
	if (body.goal_type !== undefined) {
		const currentGoalType = Array.isArray(currentGame.goal_type) ? currentGame.goal_type : [];
		updateFields.goal_type = [...currentGoalType, body.goal_type];
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
			assists = ${updateFields.assists !== undefined ? updateFields.assists : currentGame.assists},
			status = ${updateFields.status !== undefined ? updateFields.status : currentGame.status},
			opponent_team_name = ${updateFields.opponent_team_name !== undefined ? updateFields.opponent_team_name : currentGame.opponentName},
			goalie_change = ${updateFields.goalie_change !== undefined ? updateFields.goalie_change : currentGame.goalie_change},
			updated_at = NOW()
		WHERE id = ${gameId}
		RETURNING id
	`;
	console.log('PATCH updateFields:', updateFields);
	console.log('PATCH SQL result:', result);
	return json({ success: true, message: 'Peli päivitetty', updated: Object.keys(updateFields) });
};
