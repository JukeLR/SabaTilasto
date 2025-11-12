import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';
import { getUserById } from '$lib/auth';

// Hae kaikki käyttäjät (vain adminille)
export const GET = async ({ cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const user = await getUserById(parseInt(userId));
		if (!user || user.role !== 'admin') {
			return json({ error: 'Ei oikeutta' }, { status: 403 });
		}

		// Hae käyttäjät
		const users = await sql`
			SELECT id, username, email, first_name, last_name, role, team_ids, created_at
			FROM users
			ORDER BY created_at DESC
		`;

		// Hae kaikki joukkueet
		const teams = await sql`
			SELECT id, name FROM teams ORDER BY name ASC
		`;

		// Yhdistä joukkueiden nimet käyttäjiin
		const usersWithTeams = users.map((user: any) => {
			const userTeamIds = user.team_ids || [];
			const userTeams = teams
				.filter((team: any) => userTeamIds.includes(team.id))
				.map((team: any) => ({
					id: team.id,
					name: team.name
				}));
			
			return {
				...user,
				teams: userTeams
			};
		});

		return json({ users: usersWithTeams });

	} catch (error) {
		console.error('Get users error:', error);
		return json({ error: 'Käyttäjien haku epäonnistui' }, { status: 500 });
	}
};

// Päivitä käyttäjän rooli tai joukkueet (vain adminille)
export const PUT = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const user = await getUserById(parseInt(userId));
		if (!user || user.role !== 'admin') {
			return json({ error: 'Ei oikeutta' }, { status: 403 });
		}

		const { targetUserId, newRole, teamIds } = await request.json();

		// Jos päivitetään rooli
		if (newRole !== undefined) {
			// Validoi rooli
			const validRoles = ['admin', 'junioripäällikkö', 'vastuuvalmentaja', 'toimihenkilö', 'kirjuri', 'pelaaja'];
			if (!validRoles.includes(newRole)) {
				return json({ error: 'Virheellinen rooli' }, { status: 400 });
			}

			await sql`
				UPDATE users
				SET role = ${newRole}
				WHERE id = ${targetUserId}
			`;
		}

		// Jos päivitetään joukkueet (array of team IDs)
		if (teamIds !== undefined) {
			// PostgreSQL array syntaksi
			const teamIdsArray = Array.isArray(teamIds) && teamIds.length > 0 
				? teamIds 
				: null;

			await sql`
				UPDATE users
				SET team_ids = ${teamIdsArray}
				WHERE id = ${targetUserId}
			`;
		}

		return json({ success: true });

	} catch (error) {
		console.error('Update user error:', error);
		return json({ error: 'Päivitys epäonnistui' }, { status: 500 });
	}
};
