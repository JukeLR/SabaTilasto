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

		const { status } = await request.json();

		// Validoi status
		const validStatuses = ['Luotu', 'Käynnissä', 'Pelattu'];
		if (!status || !validStatuses.includes(status)) {
			return json({ error: 'Virheellinen status' }, { status: 400 });
		}

		// Päivitä pelin status
		const result = await sql`
			UPDATE games
			SET status = ${status}, updated_at = NOW()
			WHERE id = ${gameId} AND user_id = ${parseInt(userId)}
			RETURNING id
		`;

		if (result.length === 0) {
			return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
		}

		return json({ success: true, message: 'Pelin status päivitetty' });

	} catch (error) {
		console.error('Update game status error:', error);
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

		const {
			seriesId,
			ownTeamId,
			opponentName,
			gameLocation,
			gameDate,
			lineup,
			fieldPositions,
			notes,
			status
		} = await request.json();

		// Validointi
		if (!ownTeamId || !opponentName) {
			return json({ error: 'Oma joukkue ja vastustaja ovat pakollisia' }, { status: 400 });
		}

		// Päivitä pelin tiedot
		const result = await sql`
			UPDATE games
			SET 
				series_id = ${seriesId || null},
				own_team_id = ${ownTeamId},
				opponent_team_name = ${opponentName},
				game_location = ${gameLocation || null},
				game_date = ${gameDate || new Date().toISOString()},
				lineup = ${lineup || null},
				field_positions = ${fieldPositions || null},
				status = ${status || 'Luotu'},
				notes = ${notes || null},
				updated_at = NOW()
			WHERE id = ${gameId} AND user_id = ${parseInt(userId)}
			RETURNING id
		`;

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
