import { writable } from 'svelte/store';

export const teamsStore = writable<Record<number, string>>({});

export async function fetchTeams() {
  const res = await fetch('/api/admin/teams');
  const data = await res.json();
  const teams: Record<number, string> = {};
  for (const team of data) {
    teams[team.id] = team.name;
  }
  teamsStore.set(teams);
}
