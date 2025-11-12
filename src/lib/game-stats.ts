import { sql, type Game, type PeriodStats } from './db';

export interface GameWithStats {
	game: Game;
	periods: PeriodStats[];
}

// Luo uusi peli (ei enää käyttäjäkohtainen)
export async function createGame(
	opponentTeamName: string,
	ownTeamId?: number
): Promise<Game> {
	const result = await sql`
		INSERT INTO games (opponent_team_name, own_team_id, status)
		VALUES (${opponentTeamName}, ${ownTeamId || null}, 'Luotu')
		RETURNING *
	`;
	
	return result[0] as Game;
}

// Tallenna eräkohtaiset tilastot
export async function savePeriodStats(
	gameId: number,
	periodNumber: number,
	stats: {
		ownGoals: number;
		ownBlockedShots: number;
		ownMissedShots: number;
		ownDraws: number;
		ownTakeaways: number;
		oppGoals: number;
		oppBlockedShots: number;
		oppMissedShots: number;
		oppDraws: number;
		oppTakeaways: number;
	}
): Promise<PeriodStats> {
	const result = await sql`
		INSERT INTO period_stats (
			game_id, period_number,
			own_goals, own_blocked_shots, own_missed_shots, own_draws, own_takeaways,
			opp_goals, opp_blocked_shots, opp_missed_shots, opp_draws, opp_takeaways
		) VALUES (
			${gameId}, ${periodNumber},
			${stats.ownGoals}, ${stats.ownBlockedShots}, ${stats.ownMissedShots}, 
			${stats.ownDraws}, ${stats.ownTakeaways},
			${stats.oppGoals}, ${stats.oppBlockedShots}, ${stats.oppMissedShots}, 
			${stats.oppDraws}, ${stats.oppTakeaways}
		)
		ON CONFLICT (game_id, period_number) 
		DO UPDATE SET
			own_goals = ${stats.ownGoals},
			own_blocked_shots = ${stats.ownBlockedShots},
			own_missed_shots = ${stats.ownMissedShots},
			own_draws = ${stats.ownDraws},
			own_takeaways = ${stats.ownTakeaways},
			opp_goals = ${stats.oppGoals},
			opp_blocked_shots = ${stats.oppBlockedShots},
			opp_missed_shots = ${stats.oppMissedShots},
			opp_draws = ${stats.oppDraws},
			opp_takeaways = ${stats.oppTakeaways}
		RETURNING *
	`;
	
	return result[0] as PeriodStats;
}

// Päivitä pelin lopputulos
export async function updateGameScore(
	gameId: number,
	finalOwnScore: number,
	finalOppScore: number
): Promise<Game> {
	const result = await sql`
		UPDATE games 
		SET final_own_score = ${finalOwnScore}, 
		    final_opp_score = ${finalOppScore}
		WHERE id = ${gameId}
		RETURNING *
	`;
	
	return result[0] as Game;
}

// Hae pelin tiedot tilastoineen
export async function getGameWithStats(gameId: number): Promise<GameWithStats | null> {
	const gameResult = await sql`
		SELECT * FROM games WHERE id = ${gameId}
	`;
	
	if (!gameResult[0]) {
		return null;
	}
	
	const periodsResult = await sql`
		SELECT * FROM period_stats 
		WHERE game_id = ${gameId}
		ORDER BY period_number
	`;
	
	return {
		game: gameResult[0] as Game,
		periods: periodsResult as PeriodStats[]
	};
}

// Hae kaikki pelit (ei käyttäjäkohtaisia)
export async function getAllGames(): Promise<Game[]> {
	const result = await sql`
		SELECT * FROM games 
		ORDER BY game_date DESC, created_at DESC
	`;
	
	return result as Game[];
}

// Hae pelin eräkohtaiset tilastot
export async function getGamePeriodStats(gameId: number): Promise<PeriodStats[]> {
	const result = await sql`
		SELECT * FROM period_stats 
		WHERE game_id = ${gameId}
		ORDER BY period_number
	`;
	
	return result as PeriodStats[];
}

// Poista peli
export async function deleteGame(gameId: number): Promise<boolean> {
	const result = await sql`
		DELETE FROM games 
		WHERE id = ${gameId}
		RETURNING id
	`;
	
	return result.length > 0;
}
