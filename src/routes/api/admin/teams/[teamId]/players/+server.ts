import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import { getUserById } from '$lib/auth';

export const GET: RequestHandler = async ({ params }) => {
	try {
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
			console.log(`Pelaaja ${player.first_name} ${player.last_name}, team_ids:`, player.team_ids);
			if (!player.team_ids) return false;
			const hasTeam = player.team_ids.includes(teamId);
			console.log(`  Sisältää joukkueen ${teamId}:`, hasTeam);
			return hasTeam;
		});

		console.log('Löydettiin pelaajia joukkueelle', teamId, ':', players.length);
		console.log('Palautetaan pelaajat:', players.map(p => `${p.first_name} ${p.last_name}`));

		return json(players);
	} catch (error) {
		console.error('Virhe pelaajien haussa:', error);
		return json({ error: 'Pelaajien haku epäonnistui' }, { status: 500 });
	}
};
