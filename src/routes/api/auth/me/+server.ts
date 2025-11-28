import { json, type RequestEvent } from '@sveltejs/kit';
import { getUserById } from '$lib/auth';

export const GET = async ({ cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const user = await getUserById(parseInt(userId));
		if (!user) {
			return json({ error: 'Käyttäjää ei löytynyt' }, { status: 404 });
		}

		return json({ 
			   user: { 
				   id: user.id, 
				   username: user.username, 
				   email: user.email,
				   role: user.role,
				   firstName: user.first_name,
				   lastName: user.last_name,
				   team_ids: user.team_ids, // palautetaan myös team_ids
				   player_ids: user.player_ids // palautetaan myös player_ids
			   } 
		});

	} catch (error) {
		console.error('Get user error:', error);
		return json({ error: 'Käyttäjän haku epäonnistui' }, { status: 500 });
	}
};
