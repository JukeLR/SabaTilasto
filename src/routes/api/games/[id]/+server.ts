import { json, type RequestEvent } from '@sveltejs/kit';
import { getGameWithStats } from '$lib/game-stats';

export const GET = async ({ params, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const gameId = parseInt(params.id || '0');
		if (!gameId) {
			return json({ error: 'Virheellinen peli ID' }, { status: 400 });
		}

		const gameData = await getGameWithStats(gameId);
		if (!gameData) {
			return json({ error: 'Peliä ei löytynyt' }, { status: 404 });
		}

		// Varmista että peli kuuluu käyttäjälle
		if (gameData.game.user_id !== parseInt(userId)) {
			return json({ error: 'Ei oikeutta' }, { status: 403 });
		}

		return json(gameData);

	} catch (error) {
		console.error('Get game error:', error);
		return json({ error: 'Pelin haku epäonnistui' }, { status: 500 });
	}
};
