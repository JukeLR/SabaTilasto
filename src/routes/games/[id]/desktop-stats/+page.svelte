<script lang="ts">
import { goto } from "$app/navigation";
import { onMount } from 'svelte';
import { page } from "$app/stores";
import { teamsStore } from '$lib/stores/teams';
import { get } from 'svelte/store';

let ownTeamName = '';
let opponentTeamName = '';
let ownTeamId: number | null = null;
let joukkueiden_paikat = true; // true = oma vasemmalla, false = oma oikealla

import { fetchTeams } from '$lib/stores/teams';

onMount(async () => {
	await fetchTeams();
	const id = $page.params.id ?? $page.data.id;
	const res = await fetch(`/api/games/${id}?basic=true`);
	const data = await res.json();
	ownTeamId = data.own_team_id || null;
	// Ensisijaisesti käytä ownTeamName, fallback teamsStore jos puuttuu
	ownTeamName = data.ownTeamName || (ownTeamId && get(teamsStore)[ownTeamId]) || '';
	opponentTeamName = data.opponentName || data.opponent_team_name || '';
});
</script>

<div class="desktop-stats-root">
	<div class="top-row">
		{#if joukkueiden_paikat}
			<div class="team-name left">{ownTeamName}</div>
			<div class="center-controls">
				<button class="arrow-btn" aria-label="Vaihda joukkueiden paikat" on:click={() => joukkueiden_paikat = !joukkueiden_paikat}>
					<svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
						<path d="M2 12h44" stroke="white" stroke-width="3" stroke-linecap="round"/>
						<path d="M10 6l-8 6 8 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M38 6l8 6-8 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<button class="lineup-btn" on:click={() => goto(`/games/${$page.params.id}/desktop-stats/fp`)}>Kentälliset</button>
			</div>
			<div class="team-name right">{opponentTeamName}</div>
		{:else}
			<div class="team-name left">{opponentTeamName}</div>
			<div class="center-controls">
				<button class="arrow-btn swapped" aria-label="Vaihda joukkueiden paikat" on:click={() => joukkueiden_paikat = !joukkueiden_paikat}>
					<svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
						<path d="M2 12h44" stroke="white" stroke-width="3" stroke-linecap="round"/>
						<path d="M10 6l-8 6 8 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M38 6l8 6-8 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<button class="lineup-btn" on:click={() => goto(`/games/${$page.params.id}/desktop-stats/fp`)}>Kentälliset</button>
			</div>
			<div class="team-name right">{ownTeamName}</div>
		{/if}
	</div>
	<!-- Tänne rakennetaan lisää sisältöä -->
</div>

<style>
	.desktop-stats-root {
		width: 2000px;
		height: 2600px;
		max-width: 100vw;
		max-height: 100vh;
		margin: 0 auto;
		background: #fff;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}
	.top-row {
		display: flex;
		flex-direction: row;
		width: 100%;
		height: 50px;
		align-items: center;
		justify-content: space-between;
		border-bottom: 2px solid #eee;
		background: #f8f8f8;
		box-sizing: border-box;
	}
	.team-name {
		flex: 0 1 320px;
		min-width: 0;
		max-width: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		color: #222;
		padding: 0 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.team-name.left {}
	.team-name.right {}
	.center-controls {
		flex: 0 1 340px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 16px;
	}
	.arrow-btn, .lineup-btn {
		font-size: 1.0rem;
		padding: 5px 9px;
		border-radius: 10px;
		border: none;
		background: #5b9bd5;
		color: #fff;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
		min-width: 44px;
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.arrow-btn.swapped {
		background: #4caf50;
		color: #fff;
	}
	.arrow-btn:hover, .lineup-btn:hover {
		background: #4177b6;
	}
	@media (max-width: 2000px) {
		.desktop-stats-root {
			width: 100vw;
		}
	}
	@media (max-height: 2600px) {
		.desktop-stats-root {
			height: 100vh;
		}
	}
	@media (max-width: 900px) {
		.desktop-stats-root {
			width: 100vw;
			min-width: 0;
			padding: 0;
		}
		.top-row {
			height: 60px;
		}
		.team-name {
			font-size: 1.2rem;
			padding: 0 8px;
		}
		.arrow-btn, .lineup-btn {
			font-size: 1rem;
			padding: 8px 12px;
		}
		.center-controls {
			gap: 8px;
		}
	}
</style>


