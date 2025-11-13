
import { writable } from 'svelte/store';

export const lineupPlayersStore = writable<LineupPlayer[]>([]);

export async function fetchLineupPlayers(ids: number[]) {
  if (!ids || ids.length === 0) {
    lineupPlayersStore.set([]);
    return;
  }
  // Hae kaikki pelaajat yhdellä kutsulla, esim. /api/players?ids=1,2,3
  const res = await fetch(`/api/players?ids=${ids.join(',')}`);
  const data = await res.json();
  // Oletetaan että data on [{id, nick}, ...]
  lineupPlayersStore.set(data);
}
