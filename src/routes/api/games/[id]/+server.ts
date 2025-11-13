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
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const gameId = parseInt(params.id || '0');
		if (!gameId) {
			return json({ error: 'Virheellinen peli ID' }, { status: 400 });
		}

		const body = await request.json();

		// Jos kyseessä on status-päivitys
		if (body.status) {
			const validStatuses = ['Luotu', 'Käynnissä', 'Pelattu'];
			if (!validStatuses.includes(body.status)) {
				return json({ error: 'Virheellinen status' }, { status: 400 });
			}

			const result = await sql`
				UPDATE games
				SET status = ${body.status}, updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;

			if (result.length === 0) {
				return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
			}

			return json({ success: true, message: 'Pelin status päivitetty' });
		}

		// Jos kyseessä on tilastojen päivitys (plus_points ja goal_type)
		if (body.plus_points !== undefined) {
			// Hae nykyiset arvot
			const currentGame = await sql`
				SELECT plus_points, goal_type
				FROM games
				WHERE id = ${gameId}
			`;

			if (currentGame.length === 0) {
				return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
			}

			const currentPlusPoints = currentGame[0].plus_points || [];
			const currentGoalType = currentGame[0].goal_type || [];

			// Lisää uudet arvot (poppi tyylillä)
			const updatedPlusPoints = [...currentPlusPoints, ...body.plus_points];
			const updatedGoalType = [...currentGoalType, body.goal_type];

			const result = await sql`
				UPDATE games
				SET 
					plus_points = ${updatedPlusPoints},
					goal_type = ${updatedGoalType},
					updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;

			return json({ success: true, message: 'Plus points ja goal type päivitetty' });
		}

		// Jos kyseessä on maalintekijä ja syöttäjä
		if (body.team_goals !== undefined) {
			// Hae nykyiset arvot
			const currentGame = await sql`
				SELECT team_goals, assists
				FROM games
				WHERE id = ${gameId}
			`;

			if (currentGame.length === 0) {
				return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
			}

			const currentTeamGoals = currentGame[0].team_goals || [];
			const currentAssists = currentGame[0].assists || [];

			// Lisää uudet arvot
			const updatedTeamGoals = [...currentTeamGoals, body.team_goals];
			const updatedAssists = body.assists ? [...currentAssists, body.assists] : currentAssists;

			const result = await sql`
				UPDATE games
				SET 
					team_goals = ${updatedTeamGoals},
					assists = ${updatedAssists},
					updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;

			return json({ success: true, message: 'Maalintekijä ja syöttäjä päivitetty' });
		}

		// Jos kyseessä on vastustajan maali
		if (body.opponent_goal !== undefined) {
			// Hae nykyiset arvot
			const currentGame = await sql`
				SELECT opponent_goals
				FROM games
				WHERE id = ${gameId}
			`;

			if (currentGame.length === 0) {
				return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
			}

			const currentOpponentGoals = currentGame[0].opponent_goals || [];

			// Lisää arvo (voi olla "TM" tai maalivahti ID)
			const updatedOpponentGoals = [...currentOpponentGoals, body.opponent_goal];

			const result = await sql`
				UPDATE games
				SET 
					opponent_goals = ${updatedOpponentGoals},
					updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;

			return json({ success: true, message: 'Vastustajan maali päivitetty' });
		}

		// Jos kyseessä on minus_points
		if (body.minus_points !== undefined) {
			// Hae nykyiset arvot
			const currentGame = await sql`
				SELECT minus_points, goal_type
				FROM games
				WHERE id = ${gameId}
			`;

			if (currentGame.length === 0) {
				return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
			}

			const currentMinusPoints = currentGame[0].minus_points || [];
			const currentGoalType = currentGame[0].goal_type || [];

			// Lisää uudet arvot (poppi tyylillä)
			const updatedMinusPoints = [...currentMinusPoints, ...body.minus_points];
			const updatedGoalType = [...currentGoalType, body.goal_type];

			const result = await sql`
				UPDATE games
				SET 
					minus_points = ${updatedMinusPoints},
					goal_type = ${updatedGoalType},
					updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;

			return json({ success: true, message: 'Minus points ja goal type päivitetty' });
		}

		return json({ error: 'Ei päivitettäviä kenttiä' }, { status: 400 });

	} catch (error) {
		console.error('Update game error:', error);
		return json({ error: 'Pelin päivitys epäonnistui' }, { status: 500 });
	}
};

export const PUT = async ({ params, request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const gameId = parseInt(params.id || '0');
		if (!gameId) {
			return json({ error: 'Virheellinen peli ID' }, { status: 400 });
		}

		const { fieldPositions, lineup } = await request.json();

		// Päivitä field_positions ja lineup, jos lineup mukana
		let result;
		if (lineup !== undefined) {
			result = await sql`
				UPDATE games
				SET 
					field_positions = ${fieldPositions || null},
					lineup = ${lineup || null},
					updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;
		} else {
			result = await sql`
				UPDATE games
				SET 
					field_positions = ${fieldPositions || null},
					updated_at = NOW()
				WHERE id = ${gameId}
				RETURNING id
			`;
		}

		if (result.length === 0) {
			return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
		}

		return json({ 
			success: true, 
			gameId: result[0].id,
			message: 'Peli päivitetty onnistuneesti' 
		});

	} catch (error) {
		console.error('Update game error:', error);
		return json({ error: 'Pelin päivitys epäonnistui' }, { status: 500 });
	}
};
