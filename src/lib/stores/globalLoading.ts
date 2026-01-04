import { writable } from 'svelte/store';

export const globalLoading = writable<string | null>(null);