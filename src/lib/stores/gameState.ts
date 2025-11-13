import { writable } from 'svelte/store';

export const gameLineup = writable<number[]>([]);
export const gameFieldPositions = writable<number[]>([]);
