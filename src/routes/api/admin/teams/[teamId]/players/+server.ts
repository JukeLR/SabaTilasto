import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { getUserById } from '$lib/auth';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const userId = cookies.get('user_id');
		
		if (!userId) {
			return json({ error: 'Ei kirjauduttu sisään' }, { status: 401 });
		}

		const user = await getUserById(parseInt(userId));
		
		if (!user) {
			return json({ error: 'Ei oikeuksia' }, { status: 403 });
		}

		const teamId = parseInt(params.teamId);
		
		if (isNaN(teamId)) {
			return json({ error: 'Virheellinen joukkueen ID' }, { status: 400 });
		}

		console.log('Haetaan pelaajia joukkueelle ID:', teamId);

		// Hae ensin kaikki pelaajat ja filtteröi JavaScriptillä
		// Tämä on varmempi tapa kuin PostgreSQL array-operaatiot
		const allPlayers = await sql`
			SELECT 
				id,
				first_name,
				last_name,
				nick,
				position,
				jersey_number,
				created_at,
				team_ids
			FROM players
		`;

		console.log('Kaikki pelaajat:', allPlayers.length);

		// Filtteröi pelaajat joilla on kyseinen team_id
		const players = allPlayers.filter(player => {
			if (!player.team_ids) return false;
			return player.team_ids.includes(teamId);
		});

		console.log('Löydettiin pelaajia joukkueelle', teamId, ':', players.length);

		return json({ players });
	} catch (error) {
		console.error('Virhe pelaajien haussa:', error);
		return json({ error: 'Pelaajien haku epäonnistui' }, { status: 500 });
	}
};
