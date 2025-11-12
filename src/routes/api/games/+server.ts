import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const GET = async ({ cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		// Hae kaikki pelit (ei käyttäjäkohtaisia)
		const games = await sql`
			SELECT *
			FROM games
			ORDER BY game_date DESC, created_at DESC
		`;

		return json({ games });

	} catch (error) {
		console.error('Get games error:', error);
		console.error('Get games error:', error);
		return json({ error: 'Pelien haku epäonnistui' }, { status: 500 });
	}
};

export const POST = async ({ request, cookies }: RequestEvent) => {
	try {
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

		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		// Luo peli
		try {
			const result = await sql`
				INSERT INTO games (
					series_id,
					own_team_id,
					opponent_team_name,
					game_location,
					game_date,
					lineup,
					field_positions,
					status,
					notes,
					created_at,
					updated_at
				) VALUES (
					${seriesId || null},
					${ownTeamId},
					${opponentName},
					${gameLocation || null},
					${gameDate || new Date().toISOString()},
					${lineup || null},
					${fieldPositions || null},
					${status || 'Luotu'},
					${notes || null},
					NOW(),
					NOW()
				)
				RETURNING id
			`;

			const gameId = result[0].id;

			return json({ 
				success: true, 
				gameId,
				message: 'Peli luotu onnistuneesti' 
			});
		} catch (dbError) {
			console.error('Database insert error:', dbError);
			console.error('Data:', { ownTeamId, opponentName, gameLocation, gameDate, lineup, fieldPositions, status, notes });
			throw dbError;
		}

	} catch (error) {
		console.error('Create game error:', error);
		return json({ 
			error: 'Pelin luominen epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'),
			details: error instanceof Error ? error.stack : undefined
		}, { status: 500 });
	}
};
