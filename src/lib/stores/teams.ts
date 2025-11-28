import { writable } from 'svelte/store';

export const teamsStore = writable<Record<number, string>>({});

export async function fetchTeams() {
  const res = await fetch('/api/admin/teams');
  const data = await res.json();
  // Accept both { teams: [...] } and [...]
  const teamArray = Array.isArray(data) ? data : Array.isArray(data.teams) ? data.teams : [];
  const teams: Record<number, string> = {};
  for (const team of teamArray) {
    teams[team.id] = team.name;
  }
  teamsStore.set(teams);
}
