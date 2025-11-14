import { json, type RequestEvent } from '@sveltejs/kit';
import { getGameWithStats } from '$lib/game-stats';
import { sql } from '$lib/db';

export const GET = async ({ params, cookies, url }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const gameId = parseInt(params.id || '0');
		if (!gameId) {
			return json({ error: 'Virheellinen peli ID' }, { status: 400 });
		}

		// Jos pyydetään vain perustiedot (ilman tilastoja)
		const basicOnly = url.searchParams.get('basic') === 'true';
		
		if (basicOnly) {
			// Hae vain pelin perustiedot
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
					g.shots_on_goal,
					g.shots_off_target,
					g.shots_blocked,
					g.blocks,
					g.saves,
					g.goalie_game_interruption,
					g.opponent_shots_off,
					t.name as "ownTeamName"
				FROM games g
				LEFT JOIN teams t ON g.own_team_id = t.id
				WHERE g.id = ${gameId}
			`;

			if (games.length === 0) {
				return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
			}

			return json(games[0]);
		}

		// Hae peli tilastoineen
		const gameData = await getGameWithStats(gameId);
		if (!gameData) {
			return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
		}

		// Pelit eivät ole enää käyttäjäkohtaisia, joten ei tarvitse tarkistaa omistajuutta

		return json(gameData);

	} catch (error) {
		console.error('Get game error:', error);
		return json({ error: 'Pelin haku epäonnistui' }, { status: 500 });
	}
};

export const PATCH = async ({ params, request, cookies }: RequestEvent) => {
			const gameId = parseInt(params.id || '0');
		// Yhdistetty päivityslogiikka
		const body = await request.json();
		console.log('PATCH body:', body);
		// Hae nykyiset arvot vain kerran
		const gameRes = await sql`SELECT * FROM games WHERE id = ${gameId}`;
		if (gameRes.length === 0) {
			return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
		}
		const currentGame = gameRes[0];

		let updateFields: any = {};
										if (body.opponent_shots_off !== undefined) {
											const currentOpponentShotsOff = typeof currentGame.opponent_shots_off === 'number' ? currentGame.opponent_shots_off : 0;
											updateFields.opponent_shots_off = currentOpponentShotsOff + 1;
										}
										if (body.saves !== undefined) {
											const currentSaves = currentGame.saves || [];
											updateFields.saves = [...currentSaves, ...(Array.isArray(body.saves) ? body.saves : [body.saves])];
										}
										if (body.goalie_game_interruption !== undefined) {
											const currentGoalieGameInterruption = currentGame.goalie_game_interruption || [];
											updateFields.goalie_game_interruption = [...currentGoalieGameInterruption, ...(Array.isArray(body.goalie_game_interruption) ? body.goalie_game_interruption : [body.goalie_game_interruption])];
										}
										if (body.saves !== undefined) {
											const currentSaves = currentGame.saves || [];
											updateFields.saves = [...currentSaves, ...(Array.isArray(body.saves) ? body.saves : [body.saves])];
										}
								if (body.blocks !== undefined) {
									const currentBlocks = currentGame.blocks || [];
									updateFields.blocks = [...currentBlocks, ...(Array.isArray(body.blocks) ? body.blocks : [body.blocks])];
								}
						if (body.shots_blocked !== undefined) {
							const currentShotsBlocked = currentGame.shots_blocked || [];
							updateFields.shots_blocked = [...currentShotsBlocked, ...(Array.isArray(body.shots_blocked) ? body.shots_blocked : [body.shots_blocked])];
						}
				if (body.shots_off_target !== undefined) {
					const currentShotsOffTarget = currentGame.shots_off_target || [];
					updateFields.shots_off_target = [...currentShotsOffTarget, ...(Array.isArray(body.shots_off_target) ? body.shots_off_target : [body.shots_off_target])];
				}
		if (body.plus_points !== undefined) {
			const currentPlusPoints = currentGame.plus_points || [];
			updateFields.plus_points = [...currentPlusPoints, ...body.plus_points];
		}
		if (body.minus_points !== undefined) {
			const currentMinusPoints = currentGame.minus_points || [];
			updateFields.minus_points = [...currentMinusPoints, ...body.minus_points];
		}
		if (body.team_goals !== undefined) {
			const currentTeamGoals = currentGame.team_goals || [];
			updateFields.team_goals = [...currentTeamGoals, ...(Array.isArray(body.team_goals) ? body.team_goals : [body.team_goals])];
		}
		if (body.assists !== undefined) {
			const currentAssists = currentGame.assists || [];
			updateFields.assists = [...currentAssists, ...(Array.isArray(body.assists) ? body.assists : [body.assists])];
		}
		if (body.opponent_goals !== undefined) {
			const currentOpponentGoals = currentGame.opponent_goals || [];
			updateFields.opponent_goals = [...currentOpponentGoals, ...(Array.isArray(body.opponent_goals) ? body.opponent_goals : [body.opponent_goals])];
		}
		if (body.shots_on_goal !== undefined) {
			const currentShotsOnGoal = currentGame.shots_on_goal || [];
			updateFields.shots_on_goal = [...currentShotsOnGoal, ...(Array.isArray(body.shots_on_goal) ? body.shots_on_goal : [body.shots_on_goal])];
		}
		if (body.goal_type !== undefined) {
			const currentGoalType = currentGame.goal_type || [];
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
				opponent_shots_off = ${updateFields.opponent_shots_off !== undefined ? updateFields.opponent_shots_off : currentGame.opponent_shots_off},
				saves = ${updateFields.saves !== undefined ? updateFields.saves : currentGame.saves},
				goalie_game_interruption = ${updateFields.goalie_game_interruption !== undefined ? updateFields.goalie_game_interruption : currentGame.goalie_game_interruption},
				assists = ${updateFields.assists !== undefined ? updateFields.assists : currentGame.assists},
				status = ${updateFields.status !== undefined ? updateFields.status : currentGame.status},
				updated_at = NOW()
			WHERE id = ${gameId}
			RETURNING id
		`;
		console.log('PATCH updateFields:', updateFields);
		console.log('PATCH SQL result:', result);
		return json({ success: true, message: 'Peli päivitetty', updated: Object.keys(updateFields) });
	}
