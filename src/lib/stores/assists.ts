import { writable } from 'svelte/store';

// Syötöt: integer[] games-taulusta
export const assists = writable<number[]>([]);

// Hakee assists-tiedot pelille Neon-backendistä
export async function fetchAssists(gameId: number | string) {
	const res = await fetch(`/api/games/${gameId}?fields=assists`);
	if (!res.ok) return;
	const data = await res.json();
	// Oletetaan että data.assists on integer[]
	if (Array.isArray(data.assists)) {
		assists.set(data.assists);
	}
}
