
<script lang="ts">
// DEBUG: Näytä opponentGoals store UI:ssa
import { assists } from '$lib/stores/assists';
import { marksStore, type Mark } from '$lib/stores/marks';
import { plusPoints, minusPoints } from '$lib/stores/plusMinusPoints';
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

import { goalieLongPass } from '$lib/stores/goalieLongPass';
import { goalieShortPass } from '$lib/stores/goalieShortPass';
import { goalieTurnover } from '$lib/stores/goalieTurnover';
import { plusMinusPlayers } from '$lib/stores/plusMinusPlayers';

// Päivitä pelaajien nimet aina kun gameLineup päivittyy
$: fetchLineupPlayers($gameLineup);


// Overlayn logiikka
type Mark = { x: number; y: number; renderX: number; renderY: number; char: string; color: string };
// marksStore Svelte-store korvaa paikallisen marks-taulukon
let tempPoint: { x: number; y: number; renderX: number; renderY: number } | null = null; // Temporary shot point
let fieldImg: HTMLImageElement;
let fieldWidth = 1, fieldHeight = 1;

// Stat button selection logic
let selectedStat = '';
const statButtons = [
	{ key: 'teamGoals', label: 'Maali<br />Meille', color: 'green' },
	{ key: 'shotsOnGoal', label: 'Veto<br />maalia kohti', color: 'green' },
	{ key: 'shotsOffTarget', label: 'Veto ohi<br />maalista', color: 'green' },
	{ key: 'shotsBlocked', label: 'Veto<br />blokkiin', color: 'green' },
	{ key: 'opponentGoals', label: 'Maali<br />Vastustajalle', color: 'red' },
	{ key: 'saves', label: 'Oman maali-<br />vahdin torjunta', color: 'green' },
	{ key: 'opponentShotOff', label: 'Vastustajan veto<br />ohi maalista', color: 'red' },
	{ key: 'blocks', label: 'Veto<br />blokattu', color: 'red' }
];

function updateFieldSize() {
	if (fieldImg) {
		fieldWidth = fieldImg.naturalWidth;
		fieldHeight = fieldImg.naturalHeight;
	}
}

function handleFieldClick(event: MouseEvent) {
	if (!fieldImg) return;
	const rect = fieldImg.getBoundingClientRect();
	let clickX = (event.clientX - rect.left) / rect.width;
	let clickY = (event.clientY - rect.top) / rect.height;
	let storeX = clickX;
	let neonX = clickX;
	let storeY = clickY;
	let neonY = clickY;
	if (!$joukkueidenPaikat) {
		neonX = 1 - clickX;
		neonY = 1 - clickY;
	}
	tempPoint = { x: storeX, y: 1 - storeY, renderX: clickX, renderY: 1 - clickY };
	// Tulosta tallennetut koordinaatit terminaaliin
	console.log(`Laukaisupiste (talletettu): x=${storeX.toFixed(3)}, y=${storeY.toFixed(3)}`);
	console.log(`Laukaisupiste (Neoniin): x=${neonX.toFixed(3)}, y=${neonY.toFixed(3)}`);
}

function handleFieldKeydown(event: KeyboardEvent) {
	// Esimerkki: Enter/Space lisää tilapäisen pisteen keskelle (debug)
	if (event.key === 'Enter' || event.key === ' ') {
		tempPoint = { x: 0.5, y: 0.5, renderX: 0.5, renderY: 0.5 };
	}
}


let saveError = '';
let pollingSaveActive = false;
let pollingSaveInterval: ReturnType<typeof setInterval> | null = null;

async function trySaveStats(options: { includeOpponentShotsOff?: boolean } = {}) {
	const id = $page.params.id ?? $page.data.id;
	try {
		const body: any = {
			plus_points: get(plusPoints),
			minus_points: get(minusPoints),
			team_goals: get(teamGoals),
			opponent_goals: get(opponentGoals),
			shots_on_goal: get(shotsOnGoal),
			shots_off_target: get(shotsOffTarget),
			shots_blocked: get(shotsBlocked),
			blocks: get(blocks),
			saves: get(saves),
			goalie_game_interruption: get(goalieGameInterruption),
			goalie_long_pass: get(goalieLongPass),
			goalie_short_pass: get(goalieShortPass),
			goalie_turnover: get(goalieTurnover),
			assists: get(assists)
		};
		if (options.includeOpponentShotsOff) {
			body.opponent_shots_off = 1;
		} else if (options.includeOpponentShotsOff === false) {
			body.opponent_shots_off = get(opponentShotOff);
		}
		// Jos polling, lisää _fromPolling: true bodyyn
		if (options.includeOpponentShotsOff === false) {
			body._fromPolling = true;
		}
		const res = await fetch(`/api/games/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error('Tallennus epäonnistui');
		saveError = '';
		if (pollingSaveActive && pollingSaveInterval) {
			clearInterval(pollingSaveInterval);
			pollingSaveActive = false;
			pollingSaveInterval = null;
		}
		return true;
	} catch (err) {
		saveError = 'Tallennus epäonnistui. Yritetään automaattisesti uudelleen...';
		return false;
	}
}

function handleSave() {
	if (
		selectedStat === 'teamGoals' &&
		selectedActionBtns.includes('plusminus') &&
		selectedActionBtns.includes('goalassist')
	) {
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'M', color: 'green' }
			]);
		}
		// 2. Lisää maalintekijä teamGoalsiin (tai 'OM' jos ei lukittu)
		if (lockedScorerId) {
			teamGoals.update(arr => [...arr, `${lockedScorerId}`]);
		} else {
			teamGoals.update(arr => [...arr, 'OM']);
		}
		// 3. Lisää syöttäjä assistsiin (jos lukittu)
		if (lockedAssistId !== null) {
			assists.update(arr => lockedAssistId !== null ? [...arr, lockedAssistId] : arr);
		}
		// 4. Lisää plusMinusPlayers id:t plusPoints storeen
		plusPoints.update(arr => [...arr, ...get(plusMinusPlayers)]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: lockedScorerId,
						team: 1,
						type: 'M',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('teamGoals:', get(teamGoals));
		console.log('assists:', get(assists));
		console.log('plusPoints:', get(plusPoints));
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedActionBtns = [];
		lockedScorerId = null;
		lockedAssistId = null;
		// ...existing code...
		// Tallennetaan tilastot Neon-tietokantaan
		trySaveStats({ includeOpponentShotsOff: true }).then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}
	if (
		selectedStat === 'opponentGoals' &&
		selectedActionBtns.includes('plusminus') 
	) {
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'M', color: 'red' }
			]);
		}
		// 2. Lisää maalivahdin id opponentGoalsiin (tai 'TM' jos tyhjä maali)
		if (selectedGoalieId) {
			opponentGoals.update(arr => [...arr, `${selectedGoalieId}`]);
		} else if (selectedNoGoalie) {
			opponentGoals.update(arr => [...arr, 'TM']);
		}		
		// 4. Lisää plusMinusPlayers id:t minusPoints storeen
		minusPoints.update(arr => [...arr, ...get(plusMinusPlayers)]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedGoalieId,
						team: 0,
						type: 'M',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('opponentGoals:', get(opponentGoals));
		console.log('minusPoints:', get(minusPoints));
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedActionBtns = [];
		selectedGoalieId = null;
		selectedNoGoalie = false;
		// ...existing code...
			trySaveStats({ includeOpponentShotsOff: true }).then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}
	if (
		selectedStat === 'shotsOnGoal') 
	{ 
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'K', color: 'green' }
			]);
		}
		// 2. Lisää pelaajan id shotsOnGoaliin
		shotsOnGoal.update(arr => [...arr, selectedPlayerIds[0]]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedPlayerIds[0],
						team: 1,
						type: 'K',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('shotsOnGoal:', get(shotsOnGoal));		
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedPlayerIds = [];
		// ...existing code...
		trySaveStats().then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}
	if (
		selectedStat === 'shotsOffTarget') 
	{ 
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'O', color: 'green' }
			]);
		}
		// 2. Lisää pelaajan id shotsOffTargetiin
		shotsOffTarget.update(arr => [...arr, selectedPlayerIds[0]]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedPlayerIds[0],
						team: 1,
						type: 'O',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('shotsOffTarget:', get(shotsOffTarget));		
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedPlayerIds = [];
		// ...existing code...
		trySaveStats().then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}
	if (
		selectedStat === 'shotsBlocked') 
	{ 
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'B', color: 'green' }
			]);
		}
		// 2. Lisää pelaajan id shotsBlockediin
		shotsBlocked.update(arr => [...arr, selectedPlayerIds[0]]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedPlayerIds[0],
						team: 1,
						type: 'B',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('shotsBlocked:', get(shotsBlocked));		
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedPlayerIds = [];
		// ...existing code...
		trySaveStats().then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}
	if (
		selectedStat === 'saves') 
	{ 
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'K', color: 'red' }
			]);
		}
		// 2. Lisää maalivahdin id savesiin
		selectedGoalieId = $gameFieldPositions[0];
		saves.update(arr => [...arr, selectedGoalieId]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedGoalieId,
						team: 0,
						type: 'K',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('saves:', get(saves));		
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedGoalieId = null;
		selectedNoGoalie = false;
		// ...existing code...
		trySaveStats().then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}
	if (
		selectedStat === 'opponentShotOff' && tempPoint) 
		{ 
			// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'O', color: 'red' }
			]);
			// 2. kasvatetaan arvoa yhdellä
			opponentShotOff.update(n => n + 1);
			// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedPlayerIds[0],
						team: 0,
						type: 'O',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
			selectedStat = '';
			// Debug: tulosta storejen arvot
			console.log('opponentShotOff:', get(opponentShotOff));        
			// ...existing code...
			trySaveStats().then(success => {
				if (!success && !pollingSaveActive) {
					pollingSaveActive = true;
					pollingSaveInterval = setInterval(trySaveStats, 10000);
				}
			});
			return;
		}
	if (
		selectedStat === 'blocks') 
	{ 
		// 1. Lisää uusi kirjain marks-taulukkoon tempPointin kohdalle
		if (tempPoint) {
			const { x, y, renderX, renderY } = tempPoint;
			marksStore.update(arr => [
				...arr,
				{ x, y, renderX, renderY, char: 'B', color: 'red' }
			]);
		}
		// 2. Lisää pelaajan id shotsBlockediin
		blocks.update(arr => [...arr, selectedPlayerIds[0]]);
		// Taustalla: lisää uusi rivi Neon-taulukkoon shotmap, jos piste on merkitty
		if (tempPoint) {
			// Laske neonX ja neonY
			let neonX = $joukkueidenPaikat ? tempPoint.x : 1 - tempPoint.x;
			let neonY = $joukkueidenPaikat ? tempPoint.y : 1 - tempPoint.y;
			// Varmista että koordinaatit ovat olemassa
			if (typeof neonX === 'number' && typeof neonY === 'number') {
				// Lähetä tiedot taustalla
				fetch('/api/shotmap', {
					method: 'POST',
					body: JSON.stringify({
						x: neonX,
						y: neonY,
						player_id: selectedPlayerIds[0],
						team: 0,
						type: 'B',
						games_id: parseInt($page.params.id ?? $page.data.id)
					}),
					headers: { 'Content-Type': 'application/json' }
				});
			}
			tempPoint = null;
		}
		// Debug: tulosta storejen arvot
		console.log('blocks:', get(blocks));		
		// 5. Nollaa valinnat
		selectedStat = '';
		selectedPlayerIds = [];
		// ...existing code...
		trySaveStats().then(success => {
			if (!success && !pollingSaveActive) {
				pollingSaveActive = true;
				pollingSaveInterval = setInterval(trySaveStats, 10000);
			}
		});
		return;
	}		
}



let ownTeamName = '';
let opponentTeamName = '';
let ownTeamId: number | null = null;
import { joukkueidenPaikat } from '$lib/stores/joukkueidenPaikat';
let debugData = {};

// Kenttäpelaajanappien monivalinta
let selectedPlayerIds: number[] = [];
function handlePlayerBtnClick(id: number) {
	if (selectedPlayerIds.includes(id)) {
		selectedPlayerIds = selectedPlayerIds.filter(pid => pid !== id);
	} else {
		selectedPlayerIds = [...selectedPlayerIds, id];
	}
}

// Maalivahtinappien valinta
let selectedGoalieId: number | null = null;
let selectedNoGoalie = false;
function handleGoalieBtnClick(id: number) {
	selectedGoalieId = selectedGoalieId === id ? null : id;
	selectedNoGoalie = false;
}
function handleNoGoalieBtnClick() {
	selectedNoGoalie = !selectedNoGoalie;
	selectedGoalieId = null;
}

// Action-nappien monivalinta
let selectedActionBtns: Array<'plusminus' | 'goalassist'> = [];
let lockedScorerId: number | null = null;
let lockedAssistId: number | null = null;
function handleActionBtnClick(type: 'plusminus' | 'goalassist') {
	if (type === 'plusminus' && (selectedStat === 'teamGoals' || selectedStat === 'opponentGoals')) {
		// Jos opponentGoals
		if (selectedStat === 'opponentGoals') {
			if (selectedPlayerIds.length === 0) {
				// Ei pelaajia valittuna: merkitse plusminus-nappi valituksi, mutta ei tallenneta storeen
				if (!selectedActionBtns.includes('plusminus')) {
					selectedActionBtns = [...selectedActionBtns, 'plusminus'];
				}
				// Merkitse maalivahti valituksi
				selectedGoalieId = $gameFieldPositions[0];
				selectedNoGoalie = false;
				selectedPlayerIds = [];
				// ...existing code...
				trySaveStats().then(success => {
					if (!success && !pollingSaveActive) {
						pollingSaveActive = true;
						pollingSaveInterval = setInterval(trySaveStats, 10000);
					}
				});
				return;
			}
			// Tallenna valitut pelaajat plusMinusPlayers-storeen
			plusMinusPlayers.set([...selectedPlayerIds]);
			// Merkitse +/- nappi valituksi
			if (!selectedActionBtns.includes('plusminus')) {
				selectedActionBtns = [...selectedActionBtns, 'plusminus'];
			}
			// Merkitse maalivahti valituksi
			selectedGoalieId = $gameFieldPositions[0];
			selectedNoGoalie = false;
			// Poista pelaajavalinnat
			selectedPlayerIds = [];
			// ...existing code...
			trySaveStats().then(success => {
				if (!success && !pollingSaveActive) {
					pollingSaveActive = true;
					pollingSaveInterval = setInterval(trySaveStats, 10000);
				}
			});
			return;
		}
		// Jos teamGoals (vanha logiikka)
		if (selectedPlayerIds.length === 0) {
			// Ei pelaajia valittuna: merkitse plusminus-nappi valituksi, mutta ei tallenneta storeen
			if (!selectedActionBtns.includes('plusminus')) {
				selectedActionBtns = [...selectedActionBtns, 'plusminus'];
			}
			// ...existing code...
			trySaveStats().then(success => {
				if (!success && !pollingSaveActive) {
					pollingSaveActive = true;
					pollingSaveInterval = setInterval(trySaveStats, 10000);
				}
			});
			return;
		}
		// Tallenna valitut pelaajat plusMinusPlayers-storeen
		plusMinusPlayers.set([...selectedPlayerIds]);
		// Merkitse +/- nappi valituksi
		if (!selectedActionBtns.includes('plusminus')) {
			selectedActionBtns = [...selectedActionBtns, 'plusminus'];
		}
		// Poista pelaajavalinnat
		selectedPlayerIds = [];
		return;
	}
	if (type === 'goalassist' && selectedStat === 'teamGoals') {
		// Lukitse maalintekijä ja syöttäjä
		if (selectedPlayerIds.length > 0) {
			lockedScorerId = selectedPlayerIds[0];
			lockedAssistId = selectedPlayerIds.length > 1 ? selectedPlayerIds[1] : null;
		}
		// Merkitse goalassist-nappi valituksi
		if (!selectedActionBtns.includes('goalassist')) {
			selectedActionBtns = [...selectedActionBtns, 'goalassist'];
		}
		// Poista pelaajavalinnat
		selectedPlayerIds = [];
		return;
	}
	// Normaali toggle-logiikka muille napeille
	if (selectedActionBtns.includes(type)) {
		selectedActionBtns = selectedActionBtns.filter(t => t !== type);
	} else {
		selectedActionBtns = [...selectedActionBtns, type];
	}
}

// "Lopeta peli" -napin toiminto
async function handleEndGame() {
	if (!window.confirm('Haluatko varmasti lopettaa pelin?')) {
		return;
	}
	const id = $page.params.id ?? $page.data.id;
	// 1. Päivitä kaikki tilastot Neon-tietokantaan (kuten polling tekee)
	await fetch(`/api/games/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			plus_points: get(plusPoints),
			minus_points: get(minusPoints),
			team_goals: get(teamGoals),
			opponent_goals: get(opponentGoals),
			shots_on_goal: get(shotsOnGoal),
			shots_off_target: get(shotsOffTarget),
			shots_blocked: get(shotsBlocked),
			blocks: get(blocks),
			saves: get(saves),
			goalie_game_interruption: get(goalieGameInterruption),
			opponent_shots_off: get(opponentShotOff),
			goalie_long_pass: get(goalieLongPass),
			goalie_short_pass: get(goalieShortPass),
			goalie_turnover: get(goalieTurnover),
			assists: get(assists),
			status: 'Pelattu'
		})
	});
	// 2. Ohjaa takaisin /games-sivulle
	globalLoading.set(null);
	goto('/games');
}

import { fetchTeams } from '$lib/stores/teams';
  import { globalLoading } from '$lib/stores/globalLoading';

// gameFieldPositions on nyt käytettävissä Svelte storesta
onMount(() => {
	// beforeunload-varmistus
	const handler = (e: BeforeUnloadEvent) => {
		e.preventDefault();
		e.returnValue = 'Haluatko varmasti poistua sivulta? Tallentamattomat muutokset voivat hävitä.';
		return 'Haluatko varmasti poistua sivulta? Tallentamattomat muutokset voivat hävitä.';
	};
	window.addEventListener('beforeunload', handler);

	let cleanupPolling: (() => void) | undefined;
	(async () => {
		await fetchTeams();
		const id = $page.params.id ?? $page.data.id;
		// Hae pelin tiedot ja aseta storeihin kun sivu avautuu
		const res = await fetch(`/api/games/${id}?basic=true`);
		const data = await res.json();
		debugData = data;
		ownTeamId = data.own_team_id || null;
		ownTeamName = data.ownTeamName || (ownTeamId && get(teamsStore)[ownTeamId]) || '';
		opponentTeamName = data.opponentName || data.opponent_team_name || '';

		// Päivitä storet vain jos dataa löytyy
		if (Array.isArray(data.lineup) && data.lineup.length > 0) gameLineup.set(data.lineup);
		if (Array.isArray(data.fieldPositions) && data.fieldPositions.length > 0) gameFieldPositions.set(data.fieldPositions);
		if (Array.isArray(data.lineup) && data.lineup.length > 0) await fetchLineupPlayers(data.lineup);
		if (Array.isArray(data.team_goals) && data.team_goals.length > 0) teamGoals.set(data.team_goals);
		if (Array.isArray(data.opponent_goals) && data.opponent_goals.length > 0) opponentGoals.set(data.opponent_goals);
		if (Array.isArray(data.shots_on_goal) && data.shots_on_goal.length > 0) shotsOnGoal.set(data.shots_on_goal);
		if (Array.isArray(data.shots_off_target) && data.shots_off_target.length > 0) shotsOffTarget.set(data.shots_off_target);
		if (Array.isArray(data.shots_blocked) && data.shots_blocked.length > 0) shotsBlocked.set(data.shots_blocked);
		if (Array.isArray(data.blocks) && data.blocks.length > 0) blocks.set(data.blocks);
		if (Array.isArray(data.saves) && data.saves.length > 0) saves.set(data.saves);
		if (Array.isArray(data.goalie_game_interruption) && data.goalie_game_interruption.length > 0) goalieGameInterruption.set(data.goalie_game_interruption);
		if (typeof data.opponent_shots_off === 'number') opponentShotOff.set(data.opponent_shots_off);
		if (Array.isArray(data.assists) && data.assists.length > 0) assists.set(data.assists);
		if (Array.isArray(data.plus_points) && data.plus_points.length > 0) plusPoints.set(data.plus_points);
		if (Array.isArray(data.minus_points) && data.minus_points.length > 0) minusPoints.set(data.minus_points);

		// Älä ylikirjoita storeja API-vastauksella, polling hoitaa Neon-päivityksen taustalla
		await fetchLineupPlayers($gameLineup);

		// Polling: päivitä Neon-tietokanta storejen arvoilla 30s välein
		const poll = setInterval(() => {
			// Polling PATCH Neon-tietokantaan
			trySaveStats({ includeOpponentShotsOff: false });
		}, 30000);
		cleanupPolling = () => clearInterval(poll);
		// Päivitä lineup vielä kerran
		await fetchLineupPlayers(get(gameLineup));
	})();

	// Palautusfunktio: siivotaan beforeunload ja polling
	return () => {
		window.removeEventListener('beforeunload', handler);
		if (cleanupPolling) cleanupPolling();
	};
});
</script>
<div class="desktop-stats-root">
	<div class="top-row">
		{#if $joukkueidenPaikat}
			<div class="team-name left">{ownTeamName}</div>
			<div class="center-controls">
				   <button class="arrow-btn" aria-label="Vaihda joukkueiden paikat" on:click={() => joukkueidenPaikat.update(v => !v)}>
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
				   <button class="arrow-btn swapped" aria-label="Vaihda joukkueiden paikat" on:click={() => joukkueidenPaikat.update(v => !v)}>
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
			{#if tempPoint}
				<div
					class="mark-dot"
					style="position: absolute; left: {(tempPoint.renderX ?? tempPoint.x) * 100}%; top: {(1 - (tempPoint.renderY ?? tempPoint.y)) * 100}%; transform: translate(-50%, -50%);"
					title={`(${((tempPoint.renderX ?? tempPoint.x)*100).toFixed(1)}, ${(100 - ((tempPoint.renderY ?? tempPoint.y)*100)).toFixed(1)})`}
				></div>
			{/if}
			{#each $marksStore as mark}
				<svg
					style="position: absolute; left: {(mark.renderX ?? mark.x) * 100}%; top: {(1 - (mark.renderY ?? mark.y)) * 100}%; transform: translate(-50%, -50%); z-index: 4;"
					width="24" height="24" viewBox="0 0 24 24"
				>
					<text x="12" y="16" text-anchor="middle" font-size="16" font-weight="bold" fill={mark.color || 'black'}>{mark.char}</text>
				</svg>
			{/each}
		</div>

	</div>

	<div class="stats-buttons-grid">

		   {#each statButtons as btn}
			   {#if btn.key === 'saves'}
				   <button
					   class="stat-btn green {selectedStat === btn.key ? 'selected' : ''}"
					   on:click={() => {
						   selectedStat = (selectedStat === btn.key ? '' : btn.key);
						   if (selectedStat === 'saves' && typeof $gameFieldPositions[0] === 'number') {
							   selectedGoalieId = $gameFieldPositions[0];
						   }
					   }}
				   >
					   <span class="label">{@html btn.label}</span>
					   <span class="value">{$saves.length}</span>
				   </button>
			   {:else if btn.key === 'opponentShotOff'}
				   <button
					   class="stat-btn red {selectedStat === btn.key ? 'selected' : ''}"
					   on:click={() => selectedStat = (selectedStat === btn.key ? '' : btn.key)}
				   >
					   <span class="label">{@html btn.label}</span>
					   <span class="value">{$opponentShotOff}</span>
				   </button>
			   {:else}
				   <button
					   class="stat-btn {btn.color} {selectedStat === btn.key ? 'selected' : ''}"
					   on:click={() => selectedStat = (selectedStat === btn.key ? '' : btn.key)}
				   >
					   <span class="label">{@html btn.label}</span>
					<span class="value">
						{btn.key === 'teamGoals' ? $teamGoals.length
						: btn.key === 'shotsOnGoal' ? $shotsOnGoal.length
						: btn.key === 'shotsOffTarget' ? $shotsOffTarget.length
						: btn.key === 'shotsBlocked' ? $shotsBlocked.length
						: btn.key === 'opponentGoals' ? $opponentGoals.length
						: btn.key === 'blocks' ? $blocks.length
						: btn.key === 'saves' ? $saves.length
						: btn.key === 'opponentShotOff' ? $opponentShotOff
						: ''}
					</span>
				   </button>
			   {/if}
		   {/each}

		<button class="stat-btn green" on:click={() => {
			selectedGoalieId = $gameFieldPositions[0];
			goalieGameInterruption.update(arr => {
				const updated = [...arr, selectedGoalieId];				
				return updated;
			});
			selectedGoalieId = null;
		}}>
			<span class="label">Maalivahdin<br />katko</span>
			<span class="value">{$goalieGameInterruption.length}</span>
		</button>
		<button class="stat-btn green" on:click={() => {
			selectedGoalieId = $gameFieldPositions[0];
			goalieLongPass.update(arr => {
				const updated = [...arr, selectedGoalieId as number];
				console.log('goalieLongPass:', updated);
				return updated;
			});
			selectedGoalieId = null;
		}}>
			<span class="label">Pitkä heitto<br />omille</span>
			<span class="value">{$goalieLongPass.length}</span>
		</button>
		<button class="stat-btn green" on:click={() => {
			if (typeof $gameFieldPositions[0] === 'number') {
				selectedGoalieId = $gameFieldPositions[0];
				goalieShortPass.update(arr => {
					const updated = [...arr, selectedGoalieId as number];					
					return updated;
				});
				selectedGoalieId = null;
			}
		}}>
			<span class="label">Lyhyt heitto<br />omille</span>
			<span class="value">{$goalieShortPass.length}</span>
		</button>
		<button class="stat-btn yellow" on:click={() => {
			if (typeof $gameFieldPositions[0] === 'number') {
				selectedGoalieId = $gameFieldPositions[0];
				goalieTurnover.update(arr => {
					const updated = [...arr, selectedGoalieId as number];
					console.log('goalieTurnover:', updated);
					return updated;
				});
				selectedGoalieId = null;
			}
		}}>
			<span class="label">Heitto<br />vastustajalle</span>
			<span class="value">{$goalieTurnover.length}</span>
		</button>
	</div>
	<div class="fp-btn-container">
		<div>	
			<p class="text-row">1. Kenttä</p>

			<div class="buttons-row three">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[1]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[1])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[1])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[2]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[2])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[2])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[3]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[3])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[3])?.nick ?? ''}
				</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[4]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[4])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[4])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[5]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[5])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[5])?.nick ?? ''}
				</button>
			</div>
			<p class="text-row">2. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[6]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[6])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[6])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[7]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[7])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[7])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[8]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[8])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[8])?.nick ?? ''}
				</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[9]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[9])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[9])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[10]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[10])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[10])?.nick ?? ''}
				</button>
			</div>
		</div>
		<div>	
			<p class="text-row">MV</p>
			<button class="fp-btn {selectedGoalieId === $gameFieldPositions[0] ? 'selected' : ''}"
				on:click={() => handleGoalieBtnClick($gameFieldPositions[0])}>
				{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[0])?.nick ?? ''}
			</button>
			<button class="fp-btn {selectedNoGoalie ? 'selected' : ''}"
				on:click={handleNoGoalieBtnClick}>
				Ei maalivahtia
			</button>
			<button class="action-btn {selectedActionBtns.includes('plusminus') ? 'pressed-green' : ''}"
				on:click={() => handleActionBtnClick('plusminus')}
				disabled={selectedStat !== 'teamGoals' && selectedStat !== 'opponentGoals'}>
				+/-
			</button>
			<button class="action-btn {selectedActionBtns.includes('goalassist') ? 'pressed-green' : ''}"
				on:click={() => handleActionBtnClick('goalassist')}
				disabled={selectedStat !== 'teamGoals' || !selectedActionBtns.includes('plusminus')}>
				Maali ja <br/>syöttö
			</button>
		</div>
		<div>	
			<p class="text-row">3. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[11]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[11])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[11])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[12]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[12])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[12])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[13]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[13])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[13])?.nick ?? ''}
				</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[14]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[14])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[14])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[15]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[15])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[15])?.nick ?? ''}
				</button>
			</div>
			<p class="text-row">4. Kenttä</p>
			<div class="buttons-row three">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[16]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[16])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[16])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[17]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[17])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[17])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[18]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[18])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[18])?.nick ?? ''}
				</button>
			</div>
			<div class="buttons-row two">
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[19]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[19])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[19])?.nick ?? ''}
				</button>
				<button class="fp-btn {selectedPlayerIds.includes($gameFieldPositions[20]) ? 'selected' : ''}"
					on:click={() => handlePlayerBtnClick($gameFieldPositions[20])}>
					{$lineupPlayersStore.find(p => p.id === $gameFieldPositions[20])?.nick ?? ''}
				</button>
			</div>
		</div>		
	</div>
	<div class="bottom-container">
		{#if saveError}
		<div class="save-error" style="color: red; font-weight: bold; text-align: center; margin-bottom: 10px;">{saveError}</div>
		{/if}
		<div>
			<button class="action-btn" style="height:60px;">Peruuta</button>
		</div>
		<div>			
			<button class="action-btn" style="height:60px;" on:click={handleSave}>Tallenna</button>		
		</div>
		<div>
			<button class="fp-btn" style="height:80px; padding: 10px">Jos maalivahti on vaihdettu pelissä, valitse tämä ennenkuin lopetat pelin</button>
			<button class="action-btn" style="height:60px;" on:click={handleEndGame}>Lopeta peli</button>
		</div>
	</div>
</div>
	

<style>
	.remove-dot-btn {
		position: absolute;
		top: 8px;
		left: 8px;
		width: 50px;
		height: 50px;
		background: #e53935;
		border-radius: 50%;
		border: 2px solid #fff;
		box-shadow: 0 1px 4px #0003;
		z-index: 10;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: filter 0.15s;
	}
	.remove-dot-btn:hover {
		filter: brightness(0.85);
	}

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
		   transition: background 0.15s, color 0.15s;
	   }
	   .fp-btn.selected {
		   background: #3b82f6 !important;
		   color: #fff;
		   border: 2px solid #2563eb;
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
	.action-btn.pressed-green {
		background: #6fcf5b !important;
		color: #111;
		border: 2px solid #3b82f6;
	}
	.action-btn:disabled {
		background: #e0e0e0 !important;
		color: #aaa !important;
		cursor: not-allowed;
		border: 1px solid #ccc;
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
	.stat-btn.selected {
		background: #3b82f6 !important;
		color: #fff;
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
		flex-wrap: wrap;
		width: 100%;
		height: 50px;
		align-items: center;
		justify-content: space-between;
		border-bottom: 2px solid #eee;
		background: #f8f8f8;
		box-sizing: border-box;
	}
	.team-name {
		flex: 1 1 0;
		min-width: 0;
		max-width: 33vw;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		color: #222;
		padding: 0 16px;
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
			flex-wrap: wrap;
		}
		.team-name {
			font-size: 1.2rem;
			padding: 0 8px;
			max-width: 50vw;
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


