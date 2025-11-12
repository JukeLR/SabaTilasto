import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';

// GET - Hae kaikki sarjat
export const GET = async ({ cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const series = await sql`
			SELECT 
				id,
				name,
				season,
				created_at,
				updated_at
			FROM series
			ORDER BY created_at DESC
		`;

		return json({ series });

	} catch (error) {
		console.error('Get series error:', error);
		return json({ error: 'Sarjojen haku epäonnistui' }, { status: 500 });
	}
};

// POST - Luo uusi sarja
export const POST = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const { name, season } = await request.json();

		// Validointi
		if (!name || !name.trim()) {
			return json({ error: 'Sarjan nimi on pakollinen' }, { status: 400 });
		}

		const result = await sql`
			INSERT INTO series (
				name,
				season,
				created_at,
				updated_at
			) VALUES (
				${name.trim()},
				${season?.trim() || null},
				NOW(),
				NOW()
			)
			RETURNING id, name, season
		`;

		return json({
			success: true,
			series: result[0],
			message: 'Sarja luotu onnistuneesti'
		});

	} catch (error) {
		console.error('Create series error:', error);
		return json({ error: 'Sarjan luominen epäonnistui' }, { status: 500 });
	}
};

// PUT - Päivitä sarja
export const PUT = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const { id, name, season } = await request.json();

		// Validointi
		if (!id) {
			return json({ error: 'Sarjan ID puuttuu' }, { status: 400 });
		}
		if (!name || !name.trim()) {
			return json({ error: 'Sarjan nimi on pakollinen' }, { status: 400 });
		}

		const result = await sql`
			UPDATE series
			SET 
				name = ${name.trim()},
				season = ${season?.trim() || null},
				updated_at = NOW()
			WHERE id = ${parseInt(id)}
			RETURNING id, name, season
		`;

		if (result.length === 0) {
			return json({ error: 'Sarjaa ei löytynyt' }, { status: 404 });
		}

		return json({
			success: true,
			series: result[0],
			message: 'Sarja päivitetty onnistuneesti'
		});

	} catch (error) {
		console.error('Update series error:', error);
		return json({ error: 'Sarjan päivittäminen epäonnistui' }, { status: 500 });
	}
};

// DELETE - Poista sarja
export const DELETE = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const { id } = await request.json();

		// Validointi
		if (!id) {
			return json({ error: 'Sarjan ID puuttuu' }, { status: 400 });
		}

		// Tarkista onko sarjalla pelejä
		const games = await sql`
			SELECT COUNT(*) as count
			FROM games
			WHERE series_id = ${parseInt(id)}
		`;

		if (parseInt(games[0].count) > 0) {
			return json({ 
				error: 'Sarjaa ei voi poistaa, koska sillä on pelejä. Poista ensin sarjan pelit.' 
			}, { status: 400 });
		}

		const result = await sql`
			DELETE FROM series
			WHERE id = ${parseInt(id)}
			RETURNING id
		`;

		if (result.length === 0) {
			return json({ error: 'Sarjaa ei löytynyt' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Sarja poistettu onnistuneesti'
		});

	} catch (error) {
		console.error('Delete series error:', error);
		return json({ error: 'Sarjan poistaminen epäonnistui' }, { status: 500 });
	}
};
