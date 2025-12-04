import { writable } from 'svelte/store';

export type Mark = { x: number; y: number; renderX: number; renderY: number; char: string; color: string };
export const marksStore = writable<Mark[]>([]);
