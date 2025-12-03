import { writable } from 'svelte/store';

// Pelaajien id:t, joilla on plussa/miinus valinta tällä sivulla
export const plusMinusPlayers = writable<number[]>([]);
