<script lang="ts">
// DEBUG: Näytä opponentGoals store UI:ssa

import { goto } from "$app/navigation";
import { onMount } from 'svelte';
import { page } from "$app/stores";
import { teamsStore } from '$lib/stores/teams';
import { get } from 'svelte/store';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';
import { lineupPlayersStore, fetchLineupPlayers } from '$lib/stores/lineupPlayers';
import { playerNames } from '$lib/stores/playerNames';
import { teamGoals } from '$lib/stores/teamGoals';
import { opponentGoals } from '$lib/stores/opponentGoals';
import { shotsOnGoal } from '$lib/stores/shotsOnGoal';
import { shotsOffTarget } from '$lib/stores/shotsOffTarget';
import { shotsBlocked } from '$lib/stores/shotsBlocked';
import { blocks } from '$lib/stores/blocks';
import { saves, goalieGameInterruption, opponentShotOff } from '$lib/stores/saves';

// Overlayn logiikka
type Mark = { x: number; y: number; renderX: number; renderY: number };
let marks: Mark[] = [];
let fieldImg: HTMLImageElement;
let fieldWidth = 1, fieldHeight = 1;

function updateFieldSize() {
	if (fieldImg) {
		fieldWidth = fieldImg.naturalWidth;
		fieldHeight = fieldImg.naturalHeight;
	}
}

function handleFieldClick(event: MouseEvent) {
	if (!fieldImg) return;
	const rect = fieldImg.getBoundingClientRect();
	// Alkuperäinen klikattu kohta (aina sama renderointia varten)
	let clickX = (event.clientX - rect.left) / rect.width;
	let clickY = (event.clientY - rect.top) / rect.height;
	// Tallennetaan marks-muuttujaan peilatut koordinaatit jos joukkueiden_paikat on false
	let storeX = clickX;
	let neonX = clickX;
	let storeY = clickY;
	let neonY = clickY;
	if (!joukkueiden_paikat) {
		neonX = 1 - clickX;
		neonY = 1 - clickY;
	}
	marks = [{ x: storeX, y: storeY, renderX: clickX, renderY: clickY }];
	// Tulosta tallennetut koordinaatit terminaaliin
	console.log(`Laukaisupiste (talletettu): x=${storeX.toFixed(3)}, y=${storeY.toFixed(3)}`);
	console.log(`Laukaisupiste (Neoniin): x=${neonX.toFixed(3)}, y=${neonY.toFixed(3)}`);
}

function handleFieldKeydown(event: KeyboardEvent) {
	// Esimerkki: Enter/Space lisää pisteen keskelle (debug)
	if (event.key === 'Enter' || event.key === ' ') {
		marks = [{ x: 0.5, y: 0.5, renderX: 0.5, renderY: 0.5 }];
	}
}


let ownTeamName = '';
let opponentTeamName = '';
let ownTeamId: number | null = null;
let joukkueiden_paikat = true; // true = oma vasemmalla, false = oma oikealla
let debugData = {};

import { fetchTeams } from '$lib/stores/teams';

// gameFieldPositions on nyt käytettävissä Svelte storesta
onMount(async () => {
       await fetchTeams();
       const id = $page.params.id ?? $page.data.id;
       const res = await fetch(`/api/games/${id}?basic=true`);
       const data = await res.json();
       debugData = data;
       ownTeamId = data.own_team_id || null;
       ownTeamName = data.ownTeamName || (ownTeamId && get(teamsStore)[ownTeamId]) || '';
       opponentTeamName = data.opponentName || data.opponent_team_name || '';

	       // Päivitä storeihin AINA API-vastauksella
	       gameLineup.set(data.lineup || []);
	       gameFieldPositions.set(data.fieldPositions || []);
	       await fetchLineupPlayers(data.lineup || []);
	       teamGoals.set(data.team_goals || []);
	       opponentGoals.set(data.opponent_goals || []);
	       shotsOnGoal.set(data.shots_on_goal || []);
	       shotsOffTarget.set(data.shots_off_target || []);
	       shotsBlocked.set(data.shots_blocked || []);
	       blocks.set(data.blocks || []);
	       saves.set(data.saves || []);
	       goalieGameInterruption.set(data.goalie_game_interruption || []);
			   opponentShotOff.set(data.opponent_shots_off ?? 0);
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



	<div class="field-image-wrapper" style="position: relative;">
		<img
			src="/Kentta.svg"
			alt="Kenttä"
			class="field-image"
			bind:this={fieldImg}
			on:load={updateFieldSize}
		/>
		<div
			class="field-overlay"
			role="button"
			aria-label="Laukaisukartta kenttä"
			tabindex="0"
			style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: auto;"
			on:click={handleFieldClick}
			on:keydown={handleFieldKeydown}
		>
			{#if marks.length > 0}
				<div
					class="mark-dot"
					style="position: absolute; left: {(marks[0].renderX ?? marks[0].x) * 100}%; top: {(marks[0].renderY ?? marks[0].y) * 100}%; transform: translate(-50%, -50%);"
					title={`(${((marks[0].renderX ?? marks[0].x)*100).toFixed(1)}, ${((marks[0].renderY ?? marks[0].y)*100).toFixed(1)})`}
				></div>
			{/if}
		</div>

	</div>

	<div class="stats-buttons-grid">
		<button class="stat-btn green">
			<span class="label">Maali<br />Meille</span>
			<span class="value">{$teamGoals.length}</span>
		</button>
		<button class="stat-btn green">
					<span class="label">Veto<br />maalia kohti</span>
					<span class="value">{$shotsOnGoal.length}</span>
				</button>
		<button class="stat-btn green">
					<span class="label">Veto ohi<br />maalista</span>
					<span class="value">{$shotsOffTarget.length}</span>
				</button>
		<button class="stat-btn green">
					<span class="label">Veto<br />blokkiin</span>
					<span class="value">{$shotsBlocked.length}</span>
				</button>

		<button class="stat-btn red">
			<span class="label">Maali<br />Vastustajalle</span>
			<span class="value">{$opponentGoals.length}</span>
		</button>
		<button class="stat-btn green">
					<span class="label">Maalivahdin<br />torjunta</span>
					<span class="value">{$saves.length}</span>
				</button>
		<button class="stat-btn red">
			<span class="label">Vastustajan veto<br />ohi maalista</span>
			<span class="value">{$opponentShotOff}</span>
		</button>
		<button class="stat-btn red">
					<span class="label">Veto<br />blokattu</span>
					<span class="value">{$blocks.length}</span>
				</button>

		<button class="stat-btn green">
					<span class="label">Maalivahdin<br />katko</span>
					<span class="value">{$goalieGameInterruption.length}</span>
				</button>
		<button class="stat-btn green">
			<span class="label">Pitkä heitto<br />omille</span>
			<span class="value">0</span>
		</button>
		<button class="stat-btn green">
			<span class="label">Lyhyt heitto<br />omille</span>
			<span class="value">0</span>
		</button>
		<button class="stat-btn yellow">
			<span class="label">Heitto<br />vastustajalle</span>
			<span class="value">0</span>
		</button>
	</div>
	<div class="fp-btn-container">
		<div>	
			<p class="text-row">1. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[1])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[2])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[3])?.nick ?? ''}</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[4])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[5])?.nick ?? ''}</button>
			</div>
			<p class="text-row">2. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[6])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[7])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[8])?.nick ?? ''}</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[9])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[10])?.nick ?? ''}</button>
			</div>      
		</div>
		<div>	
			<p class="text-row">MV</p>
			<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[0])?.nick ?? ''}</button>
			<button class="fp-btn">Ei maalivahtia</button>
			<button class="action-btn">+/-</button>
			<button class="action-btn">Maali ja <br/>syöttö</button>			
		</div>
		<div>	
			<p class="text-row">3. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[11])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[12])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[13])?.nick ?? ''}</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[14])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[15])?.nick ?? ''}</button>
			</div>
			<p class="text-row">4. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[16])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[17])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[18])?.nick ?? ''}</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[19])?.nick ?? ''}</button>
				<button class="fp-btn">{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[20])?.nick ?? ''}</button>
			</div>      
		</div>		
	</div>
	<div class="bottom-container">
		<div>
			<button class="action-btn" style="height:60px;">Peruuta</button>
		</div>
		<div>			
			<button class="action-btn" style="height:60px;">Tallenna</button>
		</div>
		<div>
			<button class="fp-btn" style="height:60px; padding: 10px">Jos maalivahti on vaihdettu pelissä,<br/>valitse tämä ennenkuin lopetat pelin</button>
			<button class="action-btn" style="height:60px;">Lopeta peli</button>
		</div>
	</div>
</div>
	

<style>
	.field-overlay {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		cursor: crosshair;
		z-index: 2;
	}
	.mark-dot {
		width: 18px;
		height: 18px;
		background: #f26a3d;
		border: 2px solid #fff;
		border-radius: 50%;
		box-shadow: 0 1px 4px #0003;
		pointer-events: none;
		z-index: 3;
	}
	.bottom-container {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 10px;
		max-width: 1200px;
		margin: 0 auto;
		align-items: end;
	}
	.fp-btn-container {
		display: grid;
		grid-template-columns: 2fr 1fr 2fr; /* vasen 2x, keskimmäinen 1x, oikea 2x */
		gap: 10px;
		max-width: 1200px;
		margin: 0 auto; /* keskittää koko rivin */
	}
	.text-row {
		font-size: 16px;   /* fonttikoko */
		font-weight: bold; /* lihavoitu */
		margin-top: 10px;
		margin-bottom: -5px;
		text-align: center;
	}
	.buttons-row.three {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.buttons-row.two {
		display: flex;
		justify-content: center;
		gap: 8px;
	}
	.fp-btn { 
		width: 100%;
		color: #111;
		min-width: 70px;
		font-size: 0.95rem;
		border-radius: 6px;
		padding: 0px 0;
		margin-top: 6px;
		margin-bottom: 6px;		
		border: 1px solid #ccc;
		background: #eee;
		cursor: pointer;
		min-height: 32px; 
	}
	.action-btn { 
		width: 70%;
		min-width: 70px;
		font-size: 0.95rem;
		font-weight: bold;
		border-radius: 6px;
		padding: 5px 0;
		margin-top: 6px;
		margin-bottom: 6px;
		margin-left: auto;
		margin-right: auto;
		display: block;
		background: #5b9bd5;
		color: #111;
		justify-content: center;
		cursor: pointer;
		min-height: 32px; 
	}
	.action-btn.pressed {
		background: #4caf50;
		color: #111;
	}
	.stats-buttons-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: repeat(3, 1fr);
		gap: 9px;
		max-width: 900px;
		margin: 10px auto 0 auto;
	}
	.stat-btn {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		min-width: 180px;
		min-height: 40px;
		border-radius: 16px;
		border: none;
		font-family: inherit;
		font-size: 12px;
		font-weight: 700;
		padding: 12px 22px 12px 18px;
		box-shadow: 0 1px 4px #0001;
		cursor: pointer;
		transition: filter 0.15s;
	}
	.stat-btn .label {
		color: #111;
		text-align: left;
		font-size: 14px;
		font-weight: 700;
		line-height: 1.1;
	}
	.stat-btn .value {
		color: #111;
		font-size: 1.6rem;
		font-weight: 700;
		margin-left: 16px;
		min-width: 24px;
		text-align: right;
		text-shadow: 0 1px 2px #0002;
	}
	.stat-btn.green {
		background: #6fcf5b;
	}
	.stat-btn.red {
		background: #f26a3d;
	}
	.stat-btn.yellow {
		background: #fff9b0;
		color: #222;
	}
	.stat-btn.yellow .value {
		color: #222;
		text-shadow: none;
	}
	.stat-btn:active {
		filter: brightness(0.95);
	}
	.field-image-wrapper {
		width: 80%;
		margin-left: auto;
		margin-right: auto;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		margin-top: 10px;
	}
	.field-image {
		max-width: 900px;
		justify-content: center;
		width: auto;
		max-width: 100%;
		height: auto;
		display: block;
		border-radius: 18px;
		box-shadow: 0 2px 12px #0001;
		background: #fff;
	}
	.desktop-stats-root {
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


