import { writable } from 'svelte/store';

export const plusPoints = writable<number[]>([]);
export const minusPoints = writable<number[]>([]);