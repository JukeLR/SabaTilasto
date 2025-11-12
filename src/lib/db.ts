import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(DATABASE_URL);

// Type definitions
export interface User {
	id: number;
	username: string;
	email: string;
	password: string;
	first_name: string | null;
	last_name: string | null;
	role: string | null;
	team_ids: number[] | null;
	created_at?: Date;
	updated_at?: Date;
}

export interface Team {
	id: number;
	name: string;
	home_city: string | null;
	age_group: string | null;
	created_at: Date;
}

export interface Game {
	id: number;
	user_id: number;
	own_team_id: number | null;
	opponent_team_name: string;
	game_date: Date;
	final_own_score: number;
	final_opp_score: number;
	created_at: Date;
	updated_at: Date;
}

export interface PeriodStats {
	id: number;
	game_id: number;
	period_number: number;
	own_goals: number;
	own_blocked_shots: number;
	own_missed_shots: number;
	own_draws: number;
	own_takeaways: number;
	opp_goals: number;
	opp_blocked_shots: number;
	opp_missed_shots: number;
	opp_draws: number;
	opp_takeaways: number;
	created_at: Date;
	updated_at: Date;
}

export interface Player {
	id: number;
	team_ids: number[] | null;
	first_name: string;
	last_name: string;
	nick: string | null;
	jersey_number: number | null;
	position: string | null;
	created_at: Date;
}
