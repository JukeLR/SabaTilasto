import { json, type RequestEvent } from '@sveltejs/kit';
import { getUserGames } from '$lib/game-stats';

export const GET = async ({ cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const games = await getUserGames(parseInt(userId));

		return json({ games });

	} catch (error) {
		console.error('Get games error:', error);
		return json({ error: 'Pelien haku epäonnistui' }, { status: 500 });
	}
};
