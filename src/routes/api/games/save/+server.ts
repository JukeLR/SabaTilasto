import { json, type RequestEvent } from '@sveltejs/kit';
import { createGame, savePeriodStats, updateGameScore } from '$lib/game-stats';

export const POST = async ({ request, cookies }: RequestEvent) => {
	try {
		const userId = cookies.get('user_id');
		if (!userId) {
			return json({ error: 'Ei kirjautunut' }, { status: 401 });
		}

		const { opponentTeamName, periodStats } = await request.json();

		if (!opponentTeamName) {
			return json({ error: 'Vastustajan nimi on pakollinen' }, { status: 400 });
		}

		// Luo peli
		const game = await createGame(parseInt(userId), opponentTeamName);

		// Tallenna eräkohtaiset tilastot
		let totalOwnScore = 0;
		let totalOppScore = 0;

		for (const [periodNum, stats] of Object.entries(periodStats)) {
			const period = parseInt(periodNum);
			await savePeriodStats(game.id, period, stats as any);
			totalOwnScore += (stats as any).ownGoals;
			totalOppScore += (stats as any).oppGoals;
		}

		// Päivitä lopputulos
		const updatedGame = await updateGameScore(game.id, totalOwnScore, totalOppScore);

		return json({ 
			success: true, 
			game: updatedGame
		});

	} catch (error) {
		console.error('Save game error:', error);
		return json({ error: 'Pelin tallennus epäonnistui' }, { status: 500 });
	}
};
