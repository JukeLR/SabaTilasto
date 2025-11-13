import { writable } from 'svelte/store';

export const playerNames = writable<Record<number, string>>({});

export async function fetchAndUpdatePlayerNames(lineup: number[]) {
  const nimet: Record<number, string> = {};
  for (const pid of lineup) {
    if (!pid) continue;
    const pres = await fetch(`/api/players/${pid}`);
    const pdata = await pres.json();
    nimet[pid] = pdata.nick || pdata.first_name || "";
  }
  playerNames.set(nimet);
}
