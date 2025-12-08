import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';

// GET - Hae kaikki pelaajat joukkueineen
export const GET = async ({ cookies }: RequestEvent) => {
	try {
		// Tarkista että käyttäjä on kirjautunut
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei oikeuksia' }, { status: 401 });
		}

		// Hae käyttäjä ja tarkista admin- tai vastuuvalmentaja-oikeus
		const userResult = await sql`SELECT role, team_ids FROM users WHERE id = ${userId}`;
		const allowedRoles = ['admin', 'vastuuvalmentaja'];
		if (!userResult[0] || !allowedRoles.includes(userResult[0].role)) {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		let players;
		if (userResult[0].role === 'admin') {
			// Admin: hae kaikki pelaajat
			players = await sql`
				SELECT 
					p.id,
					p.first_name,
					p.last_name,
					p.nick,
					p.jersey_number,
					p.position,
					p.team_ids,
					p.created_at,
					COALESCE(
						array_agg(
							json_build_object('id', t.id, 'name', t.name)
						) FILTER (WHERE t.id IS NOT NULL),
						ARRAY[]::json[]
					) as teams
				FROM players p
				LEFT JOIN teams t ON t.id = ANY(p.team_ids)
				GROUP BY p.id
				ORDER BY p.last_name, p.first_name
			`;
		} else {
			// Vastuuvalmentaja: hae vain oman joukkueen pelaajat
			const teamIds = Array.isArray(userResult[0].team_ids) ? userResult[0].team_ids : [];
			if (teamIds.length === 0) {
				players = [];
			} else {
				players = await sql`
					SELECT 
						p.id,
						p.first_name,
						p.last_name,
						p.nick,
						p.jersey_number,
						p.position,
						p.team_ids,
						p.created_at,
						COALESCE(
							array_agg(
								json_build_object('id', t.id, 'name', t.name)
							) FILTER (WHERE t.id IS NOT NULL),
							ARRAY[]::json[]
						) as teams
					FROM players p
					LEFT JOIN teams t ON t.id = ANY(p.team_ids)
					WHERE EXISTS (
						SELECT 1 FROM unnest(p.team_ids) AS tid WHERE tid = ANY(${teamIds})
					)
					GROUP BY p.id
					ORDER BY p.last_name, p.first_name
				`;
			}
		}

		return json({ players });
	} catch (error) {
		console.error('Error fetching players:', error);
		return json({ error: 'Pelaajien haku epäonnistui' }, { status: 500 });
	}
};

// POST - Lisää uusi pelaaja
export const POST = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei oikeuksia' }, { status: 401 });
		}

		const userResult = await sql`SELECT role FROM users WHERE id = ${userId}`;
		const allowedRoles = ['admin', 'vastuuvalmentaja'];
		if (!userResult[0] || !allowedRoles.includes(userResult[0].role)) {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		const { firstName, lastName, nick, jerseyNumber, position, teamIds } = await request.json();

		if (!firstName || !lastName) {
			return json({ error: 'Etunimi ja sukunimi ovat pakollisia' }, { status: 400 });
		}

		const result = await sql`
			INSERT INTO players (first_name, last_name, nick, jersey_number, position, team_ids)
			VALUES (${firstName}, ${lastName}, ${nick || null}, ${jerseyNumber || null}, ${position || null}, ${teamIds || []})
			RETURNING *
		`;

		return json({ player: result[0] });
	} catch (error) {
		console.error('Error creating player:', error);
		return json({ error: 'Pelaajan lisääminen epäonnistui' }, { status: 500 });
	}
};

// PUT - Päivitä pelaaja
export const PUT = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei oikeuksia' }, { status: 401 });
		}

		const userResult = await sql`SELECT role FROM users WHERE id = ${userId}`;
		const allowedRoles = ['admin', 'vastuuvalmentaja'];
		if (!userResult[0] || !allowedRoles.includes(userResult[0].role)) {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		const { id, firstName, lastName, nick, jerseyNumber, position, teamIds } = await request.json();

		if (!id) {
			return json({ error: 'Pelaajan ID puuttuu' }, { status: 400 });
		}

		const result = await sql`
			UPDATE players
			SET 
				first_name = ${firstName},
				last_name = ${lastName},
				nick = ${nick || null},
				jersey_number = ${jerseyNumber || null},
				position = ${position || null},
				team_ids = ${teamIds || []}
			WHERE id = ${id}
			RETURNING *
		`;

		return json({ player: result[0] });
	} catch (error) {
		console.error('Error updating player:', error);
		return json({ error: 'Pelaajan päivittäminen epäonnistui' }, { status: 500 });
	}
};

// DELETE - Poista pelaaja
export const DELETE = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei oikeuksia' }, { status: 401 });
		}

		const userResult = await sql`SELECT role FROM users WHERE id = ${userId}`;
		if (!userResult[0] || userResult[0].role !== 'admin') {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		const { id } = await request.json();

		if (!id) {
			return json({ error: 'Pelaajan ID puuttuu' }, { status: 400 });
		}

		await sql`DELETE FROM players WHERE id = ${id}`;

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting player:', error);
		return json({ error: 'Pelaajan poistaminen epäonnistui' }, { status: 500 });
	}
};
