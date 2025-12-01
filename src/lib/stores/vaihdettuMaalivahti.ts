import { writable } from 'svelte/store';

export const vaihdettuMaalivahtiStore = writable<number | null>(null);