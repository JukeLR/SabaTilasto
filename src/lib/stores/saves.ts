import { writable } from 'svelte/store';

export const saves = writable<any[]>([]);
export const goalieGameInterruption = writable<any[]>([]);
export const opponentShotOff = writable<number>(0);
