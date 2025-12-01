
<script lang="ts">
import { lineupPlayersStore, fetchLineupPlayers } from '$lib/stores/lineupPlayers';
import type { LineupPlayer } from '$lib/stores/lineupPlayers.d';
import { get } from 'svelte/store';
import { vaihdettuMaalivahtiStore } from '$lib/stores/vaihdettuMaalivahti';
import { onMount } from 'svelte';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';
import { playerNames, fetchAndUpdatePlayerNames } from '$lib/stores/playerNames';

let saveError = '';
let saveSuccess = false;
let pollingInterval: any = null;

let maalivahti: { label: string, text: string, id: number | null, editing: boolean } = { label: "Maalivahti", text: "Maalivahti", id: null, editing: false };
let editingGoalie = false;
type KenttaPelaaja = { id: number | null, text: string, editing: boolean };
let kentat: { yla: KenttaPelaaja[], ala: KenttaPelaaja[] }[] = [
  { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] },
  { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] },
  { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] },
  { yla: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ], ala: [ {id: null, text: '', editing: false}, {id: null, text: '', editing: false} ] }
];
let fieldPositions: number[] = [];
let lineup: number[] = [];

// Päivitä lineup automaattisesti storesta
$: lineup = $gameLineup;
let pelaajaNimet: Record<number, string> = {};
let lineupPlayers: LineupPlayer[] = [];
// Päivitä lineupPlayers automaattisesti storesta
$: lineupPlayers = $lineupPlayersStore;
let initialFieldPositions: number[] = [];
let isDirty = false;
let ownTeamId: number | null = null;
let opponentName: string = "";
let previousGoalieId: number | null = null;

onMount(() => {
  fetchGameData();
  pollingInterval = setInterval(fetchGameData, 30000); // 30s välein
  return () => clearInterval(pollingInterval);
});

async function fetchGameData() {
  const id = get(page).params.id;
  const res = await fetch(`/api/games/${id}?basic=true`);
  const data = await res.json();
  gameLineup.set(data.lineup || []);
  gameFieldPositions.set(data.fieldPositions || []);
  await fetchLineupPlayers(data.lineup || []);
  const fp = data.fieldPositions || [];
  maalivahti.id = fp[0] ?? null;
  // Haetaan maalivahdin nimi lineupPlayers-listasta
  const goalie = $lineupPlayersStore.find(p => p.id === maalivahti.id);
  maalivahti.text = goalie ? goalie.nick : 'Maalivahti';
  let i = 1;
  for (let k = 0; k < kentat.length; k++) {
    for (let j = 0; j < kentat[k].yla.length; j++) {
      kentat[k].yla[j].id = fp[i] ?? null;
      const player = $lineupPlayersStore.find(p => p.id === fp[i]);
      kentat[k].yla[j].text = player ? player.nick : '';
      kentat[k].yla[j].editing = false;
      i++;
    }
    for (let j = 0; j < kentat[k].ala.length; j++) {
      kentat[k].ala[j].id = fp[i] ?? null;
      const player = $lineupPlayersStore.find(p => p.id === fp[i]);
      kentat[k].ala[j].text = player ? player.nick : '';
      kentat[k].ala[j].editing = false;
      i++;
    }
  }
  // Aseta vastustajan nimi pelidatasta
  opponentName = data.opponentName || '';
  // Päivitä initialFieldPositions aina backendin palautteen mukaan
  initialFieldPositions = [...fp];
}

function editGoalie() {
  maalivahti.editing = true;
  editingGoalie = true;
}

function goBack() {
  // Peruuta: palauta alkuperäiset kentälliset ja siirry stats-sivulle
  fieldPositions = [...initialFieldPositions];
  isDirty = false;
  const unsubscribe = page.subscribe(($page) => {
    goto(`/games/${$page.params.id}/desktop-stats`);
  });
  unsubscribe();
}

function editPlayer(kenttaIdx: number, paikka: 'yla' | 'ala', pelaajaIdx: number) {
  kentat[kenttaIdx][paikka][pelaajaIdx].editing = true;
  kentat[kenttaIdx][paikka][pelaajaIdx].text = "";
  kentat[kenttaIdx][paikka][pelaajaIdx].id = null;
  // Päivitä fieldPositions
  let flat: number[] = [];
  if (typeof maalivahti.id === 'number') flat.push(maalivahti.id);
  for (let k = 0; k < kentat.length; k++) {
    for (let j = 0; j < kentat[k].yla.length; j++) {
      if (typeof kentat[k].yla[j].id === 'number') flat.push(kentat[k].yla[j].id!);
    }
    for (let j = 0; j < kentat[k].ala.length; j++) {
      if (typeof kentat[k].ala[j].id === 'number') flat.push(kentat[k].ala[j].id!);
    }
  }
  fieldPositions = flat;
  isDirty = true;
}

function selectPlayer(kenttaIdx: number, paikka: 'yla' | 'ala', pelaajaIdx: number, uusiId: number) {
  kentat[kenttaIdx][paikka][pelaajaIdx].id = uusiId;
  // Etsi nimi lineupPlayersStore:sta
  const player = lineupPlayers.find(p => p.id === uusiId);
  kentat[kenttaIdx][paikka][pelaajaIdx].text = player ? player.nick : 'Ladataan...';
  kentat[kenttaIdx][paikka][pelaajaIdx].editing = false;
  // Päivitä fieldPositions
  let flat: number[] = [];
  if (typeof maalivahti.id === 'number') flat.push(maalivahti.id);
  for (let k = 0; k < kentat.length; k++) {
    for (let j = 0; j < kentat[k].yla.length; j++) {
      if (typeof kentat[k].yla[j].id === 'number') flat.push(kentat[k].yla[j].id!);
    }
    for (let j = 0; j < kentat[k].ala.length; j++) {
      if (typeof kentat[k].ala[j].id === 'number') flat.push(kentat[k].ala[j].id!);
    }
  }
  fieldPositions = flat;
  isDirty = true;
}

function selectGoalie(uusiId: number) {
  // Tallenna alkuperäinen maalivahti vain jos sitä ei ole jo tallennettu storeen
  let currentVaihdettu: number | null | undefined = get(vaihdettuMaalivahtiStore);
  if (currentVaihdettu === undefined) {
    // Oletetaan että field_positions on saatavilla
    const fieldPositions = $gameFieldPositions || [];
    currentVaihdettu = fieldPositions[0] ?? null;
    vaihdettuMaalivahtiStore.set(typeof currentVaihdettu === 'number' ? currentVaihdettu : null);
  }
  console.log('Vaihdettu maalivahti:', currentVaihdettu);
  maalivahti.id = uusiId;
  const player = lineupPlayers.find(p => p.id === uusiId);
  maalivahti.text = player ? player.nick : 'Ladataan...';
  maalivahti.editing = false;
  editingGoalie = false;
  // Päivitä fieldPositions
}

async function saveFieldPositions() {
  saveError = '';
  saveSuccess = false;
  // Kerää fieldPositions nykyisestä kokoonpanosta
  let newFieldPositions: number[] = [];
  if (typeof maalivahti.id === 'number') newFieldPositions.push(maalivahti.id);
  for (let k = 0; k < kentat.length; k++) {
    for (let j = 0; j < kentat[k].yla.length; j++) {
      if (typeof kentat[k].yla[j].id === 'number') newFieldPositions.push(kentat[k].yla[j].id!);
    }
    for (let j = 0; j < kentat[k].ala.length; j++) {
      if (typeof kentat[k].ala[j].id === 'number') newFieldPositions.push(kentat[k].ala[j].id!);
    }
  }
  // Päivitä Svelte store
  gameFieldPositions.set(newFieldPositions);
  // Lähetä PATCH backendille
  try {
    const id = get(page).params.id;
    // Jos maalivahti vaihtui, lähetä goalie_change
    const currentGoalie = newFieldPositions[0];
    const previousGoalie = initialFieldPositions[0];
    const patchBody: any = { fieldPositions: newFieldPositions, lineup };
    if (currentGoalie !== previousGoalie && typeof currentGoalie === 'number') {
      patchBody.goalie_change = currentGoalie;
    }
    const res = await fetch(`/api/games/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      saveError = data.error || 'Tallennus epäonnistui';
    } else {
      // Päivitä tiedot heti tallennuksen jälkeen
      await fetchGameData();
      initialFieldPositions = [...newFieldPositions];
      // Ohjaa takaisin desktop-stats-sivulle
      const id = get(page).params.id;
      goto(`/games/${id}/desktop-stats`);
    }
  } catch (e) {
    saveError = 'Tallennusvirhe: ' + (e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e));
  }
}
</script>
<main class="fp-main">
  <h2>Kentälliset</h2>
  <div class="fp-grid fp-row-maalivahti">
    <div class="fp-col">
      {#if maalivahti.editing}
          <select class="fp-btn" on:change={(e) => selectGoalie(Number((e.target as HTMLSelectElement).value))}>
          <option value="">Valitse maalivahti</option>
          {#each lineup.filter(pid => !fieldPositions.includes(pid)) as pid}
            <option value={pid}>{lineupPlayers.find(p => p.id === pid)?.nick ?? ''}</option>
          {/each}
        </select>
      {:else}
        <button class="fp-btn" on:click={() => editGoalie()}>{maalivahti.text}</button>
      {/if}
    </div>
  </div>
  {#each kentat as kentta, i}
    <div class="fp-kentta">
      <div class="fp-kentta-title">{i + 1}. kenttä</div>
      <div class="fp-grid fp-row-yla">
        {#each kentta.yla as pelaaja, j}
          <div class="fp-col">
            {#if pelaaja.editing}
                <select class="fp-btn" on:change={(e) => selectPlayer(i, 'yla', j, Number((e.target as HTMLSelectElement).value))}>
                <option value="">Valitse pelaaja</option>
                {#each lineup.filter(pid => !fieldPositions.includes(pid)) as pid}
                  <option value={pid}>{lineupPlayers.find(p => p.id === pid)?.nick ?? ''}</option>
                {/each}
              </select>
            {:else}
              <button class="fp-btn" on:click={() => editPlayer(i, 'yla', j)}>{pelaaja.id !== null ? (lineupPlayers.find(p => p.id === pelaaja.id)?.nick ?? '') : ''}</button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="fp-grid fp-row-ala">
        {#each kentta.ala as pelaaja, j}
          <div class="fp-col">
            {#if pelaaja.editing}
                <select class="fp-btn" on:change={(e) => selectPlayer(i, 'ala', j, Number((e.target as HTMLSelectElement).value))}>
                <option value="">Valitse pelaaja</option>
                {#each lineup.filter(pid => !fieldPositions.includes(pid)) as pid}
                  <option value={pid}>{lineupPlayers.find(p => p.id === pid)?.nick ?? ''}</option>
                {/each}
              </select>
            {:else}
              <button class="fp-btn" on:click={() => editPlayer(i, 'ala', j)}>{pelaaja.id !== null ? (lineupPlayers.find(p => p.id === pelaaja.id)?.nick ?? '') : ''}</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}  
  <button class="fp-btn fp-cancel" on:click={goBack}>Peruuta</button>
  <button class="fp-btn fp-save" on:click={saveFieldPositions}>Tallenna</button>
  {#if saveError}
    <div class="fp-error">{saveError}</div>
  {/if}
  <!-- Ei tarvita tallennus onnistui -viestiä -->
    <style>
    .fp-error { color: #b71c1c; background: #ffeaea; padding: 8px 12px; border-radius: 6px; margin-top: 10px; }
    .fp-success { color: #1b5e20; background: #e8f5e9; padding: 8px 12px; border-radius: 6px; margin-top: 10px; }
    </style>
    
  

  </main>
<style> 
.fp-main { max-width: 400px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; align-items: center; }
.fp-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.fp-col { flex: 1; min-width: 100px; }
.fp-btn { width: 100%; font-size: 0.95rem; border-radius: 6px; padding: 7px 0; margin-bottom: 2px; border: 1px solid #ccc; background: #eee; cursor: pointer; min-height: 32px; }
.fp-save { background: #2196f3; color: #fff; font-weight: bold; }
.fp-cancel { background: #aaa; color: #fff; font-weight: bold; margin-top: 8px; }
</style>
