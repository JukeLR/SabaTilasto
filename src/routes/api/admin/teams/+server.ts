import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { getUserById } from '$lib/auth';

// GET - Hae kaikki joukkueet
export const GET: RequestHandler = async () => {
    try {
        const teams = await sql`
            SELECT id, name, home_city, age_group, created_at
            FROM teams
            ORDER BY name ASC
        `;
        return json(teams);
    } catch (error) {
        console.error('Virhe joukkueiden haussa:', error);
        return json({ error: 'Joukkueiden haku epäonnistui' }, { status: 500 });
    }
};

// POST - Lisää uusi joukkue
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const userId = cookies.get('user_id');
		
		if (!userId) {
			return json({ error: 'Ei kirjauduttu sisään' }, { status: 401 });
		}

		const user = await getUserById(parseInt(userId));
		
		if (!user || user.role !== 'admin') {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		const { name, home_city, age_group } = await request.json();

		if (!name || !name.trim()) {
			return json({ error: 'Joukkueen nimi on pakollinen' }, { status: 400 });
		}

		const result = await sql`
			INSERT INTO teams (name, home_city, age_group)
			VALUES (${name.trim()}, ${home_city || null}, ${age_group || null})
			RETURNING id, name, home_city, age_group, created_at
		`;

		return json({ team: result[0] }, { status: 201 });
	} catch (error) {
		console.error('Virhe joukkueen lisäämisessä:', error);
		return json({ error: 'Joukkueen lisääminen epäonnistui' }, { status: 500 });
	}
};

// PUT - Päivitä joukkue
export const PUT: RequestHandler = async ({ request, cookies }) => {
	   try {
		   const { id, name, home_city, age_group } = await request.json();
		   if (!id) {
			   return json({ error: 'Joukkueen id puuttuu' }, { status: 400 });
		   }
		   if (!name || !name.trim()) {
			   return json({ error: 'Joukkueen nimi on pakollinen' }, { status: 400 });
		   }
		   const result = await sql`
			   UPDATE teams
			   SET name = ${name.trim()},
				   home_city = ${home_city || null},
				   age_group = ${age_group || null}
			   WHERE id = ${id}
			   RETURNING id, name, home_city, age_group, created_at
		   `;
		   if (result.length === 0) {
			   return json({ error: 'Joukkuetta ei löytynyt' }, { status: 404 });
		   }
		   return json({ team: result[0] });
	   } catch (error) {
		   console.error('Virhe joukkueen päivittämisessä:', error);
		   return json({ error: 'Joukkueen päivittäminen epäonnistui' }, { status: 500 });
	   }
	};

// DELETE - Poista joukkue
export const DELETE: RequestHandler = async ({ request, cookies }) => {
	try {
		const userId = cookies.get('user_id');
		
		if (!userId) {
			return json({ error: 'Ei kirjauduttu sisään' }, { status: 401 });
		}

		const user = await getUserById(parseInt(userId));
		
		if (!user || user.role !== 'admin') {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		const { id } = await request.json();

		if (!id) {
			return json({ error: 'Joukkueen id puuttuu' }, { status: 400 });
		}

		const result = await sql`
			DELETE FROM teams
			WHERE id = ${id}
			RETURNING id
		`;

		if (result.length === 0) {
			return json({ error: 'Joukkuetta ei löytynyt' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Virhe joukkueen poistamisessa:', error);
		return json({ error: 'Joukkueen poistaminen epäonnistui' }, { status: 500 });
	}
};
