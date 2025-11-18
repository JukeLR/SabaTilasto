<script lang="ts">
import { teamGoals } from '$lib/stores/teamGoals';
import { get as getStore } from 'svelte/store';
let showGoalAssistSelected = false;
// Näytetään vihreä nappi kun plussia ei ole valittu mutta valinta merkitty
let showPlusSelected = false;
// Tallennusfunktio
async function saveStats() {
  const gameId = get(page).params.id;
  // PATCH: plus_points, team_goals, assists
  const payload: Record<string, any> = {};
  // Jos plussia ei ole valittu ja maalintekijä puuttuu, lähetetään PATCH vain OM-maalille
  if (plusmiinusIds.length === 0 && (goalAssist.scorer === null || goalAssist.scorer === undefined)) {
    showPlusSelected = true;
    // Ei plussia, mutta jos OM-maali, jatketaan tallennukseen
    // Ei returnia, jatketaan PATCHiin
  } else if (plusmiinusIds.length === 0) {
    showPlusSelected = true;
    alert('Valinta merkitty!');
    return;
  }
  // Lähetä PATCHissa vain uudet plussat, ei vanhoja
  if (plusmiinusIds.length > 0) {
    payload.plus_points = [...plusmiinusIds]; // vain uudet valinnat
  }
  // minus_points lähetetään vain jos niitä on valittu
  // (tällä sivulla ei ilmeisesti ole miinus-pelaajien valintaa, joten jätetään pois)
  if (goalAssist.scorer !== null && goalAssist.scorer !== undefined) {
    payload.team_goals = [goalAssist.scorer.toString()];
    if (goalAssist.assister !== null && goalAssist.assister !== undefined) {
      payload.assists = [goalAssist.assister];
    }
    // Jos syöttäjää ei ole, assists jätetään pois
  } else {
    // Jos maalintekijää ei ole, merkitään "OM" (oma maali) eikä syöttäjää
    payload.team_goals = ['OM'];
  }
  try {
    const res = await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (res.ok) {
      // Tyhjennä plusmiinusIds ja selectedPlayers PATCHin jälkeen, jotta vain uudet plussat tallennetaan
      plusmiinusIds = [];
      selectedPlayers.set([]);
      // Päivitä teamGoals-store heti, jotta stats-nappi päivittyy nopeasti
      if (payload.team_goals) {
        const prevGoals = getStore(teamGoals);
        teamGoals.set([...prevGoals, ...payload.team_goals]);
      }
      goto(`/games/${gameId}/stats`);
    } else {
      alert('Tallennus epäonnistui');
    }
  } catch (e) {
    alert('Tallennusvirhe: ' + e);
  }
}
import { writable } from 'svelte/store';

// Valintatila: 'plusmiinus' tai 'maalisyotto'
const selectionPhase = writable<'plusmiinus' | 'maalisyotto'>('plusmiinus');

// Valitut pelaajat +/- vaiheessa
const selectedPlayers = writable<number[]>([]);
// Maalintekijä ja syöttäjä id:t
const scorer = writable<number | null>(null);
const assister = writable<number | null>(null);

// Tallennetaan valitut id:t
let plusmiinusIds: number[] = [];
let goalAssist: { scorer: number | null, assister: number | null } = { scorer: null, assister: null };

function togglePlayerSelection(playerId: number) {
  $selectionPhase === 'plusmiinus'
    ? selectedPlayers.update(selected => selected.includes(playerId)
        ? selected.filter(id => id !== playerId)
        : [...selected, playerId])
    : handleGoalAssistSelection(playerId);
}

function handleGoalAssistSelection(playerId: number) {
  if ($scorer === null) {
    scorer.set(playerId);
  } else if ($assister === null && playerId !== $scorer) {
    assister.set(playerId);
  } else if ($scorer === playerId) {
    scorer.set(null);
  } else if ($assister === playerId) {
    assister.set(null);
  }
}

function handlePlusMiinus() {
  if ($selectedPlayers.length === 0) {
    showPlusSelected = true;
    // Ei siirretä mitään backendille, vain napin väri
    return;
  }
  showPlusSelected = false;
  plusmiinusIds = [...$selectedPlayers];
  selectionPhase.set('maalisyotto');
  selectedPlayers.set([]);
}

function handleGoalAssist() {
  if ($scorer === null) {
    showGoalAssistSelected = true;
    // Ei siirretä mitään backendille, vain napin väri
    return;
  }
  showGoalAssistSelected = false;
  goalAssist = { scorer: $scorer, assister: $assister };
  scorer.set(null);
  assister.set(null);
}
import { onMount } from 'svelte';
import { page } from '$app/stores';
let title = 'Laukaukset';
import { lineupPlayersStore, fetchLineupPlayers } from '$lib/stores/lineupPlayers';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { derived } from 'svelte/store';
export let sourceButton: string = '';

const fieldPositions = gameFieldPositions;
const lineupPlayers = lineupPlayersStore;

onMount(() => {
  const params = get(page);
  const urlTitle = params.url.searchParams.get('title');
  if (urlTitle) title = urlTitle;
  // Hae lineupista nimet storeen
  const lineup = get(gameLineup);
  fetchLineupPlayers(lineup);
});

function handleShot(playerId: number) {
  // Toteuta laukauksen kirjaus tähän
  alert(`Laukaus pelaajalta ${playerId}`);
}
</script>

<main class="fp-main" class:from-fp={sourceButton === 'fp'} class:from-stats={sourceButton === 'stats'}>
  <h2>{title}</h2>
    {#if title === 'Maali meille'}
      
    {/if}
  <div class="fp-grid fp-row-maalivahti">
    <div class="fp-col">
      {#if $fieldPositions && $lineupPlayers}
        <button class="fp-btn { $selectionPhase === 'plusmiinus' && $selectedPlayers.includes($fieldPositions[0]) ? 'fp-selected' : '' }{ $selectionPhase === 'maalisyotto' && $scorer === $fieldPositions[0] ? 'fp-scorer' : '' }{ $selectionPhase === 'maalisyotto' && $assister === $fieldPositions[0] ? 'fp-assister' : '' }" on:click={() => togglePlayerSelection($fieldPositions[0])}>
          {#if $fieldPositions[0] !== null}
            {#if $lineupPlayers.find(p => p.id === $fieldPositions[0])}
              {$lineupPlayers.find(p => p.id === $fieldPositions[0]).nick}
            {:else}
              &nbsp;
            {/if}
          {:else}
            Ei pelaajaa
          {/if}
        </button>
      {/if}
    </div>
  </div>
  {#each [0,1,2,3] as kenttaIdx}
    <div class="fp-kentta">
      <div class="fp-kentta-title">{kenttaIdx + 1}. kenttä</div>
      <div class="fp-grid fp-row-yla">
        {#each [0,1,2] as j}
          <div class="fp-col">
            {#if $fieldPositions && $lineupPlayers}
              <button class="fp-btn { $selectionPhase === 'plusmiinus' && $selectedPlayers.includes($fieldPositions[1 + kenttaIdx * 5 + j]) ? 'fp-selected' : '' }{ $selectionPhase === 'maalisyotto' && $scorer === $fieldPositions[1 + kenttaIdx * 5 + j] ? 'fp-scorer' : '' }{ $selectionPhase === 'maalisyotto' && $assister === $fieldPositions[1 + kenttaIdx * 5 + j] ? 'fp-assister' : '' }" on:click={() => togglePlayerSelection($fieldPositions[1 + kenttaIdx * 5 + j])}>
                {#if $fieldPositions[1 + kenttaIdx * 5 + j] !== null}
                  {#if $lineupPlayers.find(p => p.id === $fieldPositions[1 + kenttaIdx * 5 + j])}
                    {$lineupPlayers.find(p => p.id === $fieldPositions[1 + kenttaIdx * 5 + j]).nick}
                  {:else}
                    &nbsp;
                  {/if}
                {:else}
                  Ei pelaajaa
                {/if}
              </button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="fp-grid fp-row-ala">
        {#each [0,1] as j}
          <div class="fp-col">
            {#if $fieldPositions && $lineupPlayers}
              <button class="fp-btn { $selectionPhase === 'plusmiinus' && $selectedPlayers.includes($fieldPositions[1 + kenttaIdx * 5 + 3 + j]) ? 'fp-selected' : '' }{ $selectionPhase === 'maalisyotto' && $scorer === $fieldPositions[1 + kenttaIdx * 5 + 3 + j] ? 'fp-scorer' : '' }{ $selectionPhase === 'maalisyotto' && $assister === $fieldPositions[1 + kenttaIdx * 5 + 3 + j] ? 'fp-assister' : '' }" on:click={() => togglePlayerSelection($fieldPositions[1 + kenttaIdx * 5 + 3 + j])}>
                {#if $fieldPositions[1 + kenttaIdx * 5 + 3 + j] !== null}
                  {#if $lineupPlayers.find(p => p.id === $fieldPositions[1 + kenttaIdx * 5 + 3 + j])}
                    {$lineupPlayers.find(p => p.id === $fieldPositions[1 + kenttaIdx * 5 + 3 + j]).nick}
                  {:else}
                    &nbsp;
                  {/if}
                {:else}
                  Ei pelaajaa
                {/if}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
  <div class="fp-grid fp-actions">
    <div class="fp-col">
      <button class="fp-btn fp-cancel" on:click={() => goto(`/games/${get(page).params.id}/stats`)}>Takaisin</button>
    </div>
    <div class="fp-col">
      <button class="fp-btn { showPlusSelected ? 'fp-green-btn' : ($selectionPhase === 'maalisyotto' && plusmiinusIds.length > 0 ? 'fp-green-btn' : 'fp-blue-bold') }" on:click={handlePlusMiinus}><b>+/-</b></button>
    </div>
    <div class="fp-col">
      <button class="fp-btn { showGoalAssistSelected ? 'fp-green-btn' : ($selectionPhase === 'maalisyotto' && goalAssist.scorer !== null ? 'fp-green-btn' : 'fp-blue-bold') }" on:click={handleGoalAssist}><b>Maali ja Syöttö</b></button>
    </div>
  </div>
  <div class="fp-col">
    <button class="fp-btn fp-blue-bold" on:click={saveStats}><b>Tallenna</b></button>
  </div>
</main>

<style>
.fp-green-btn {
  background: #3bb54a !important;
  color: #fff;
  font-weight: bold;
  border: 2px solid #217a2b;
}
.fp-selected {
  background: #3bb54a !important;
  border: 2px solid #217a2b;
}
.fp-scorer {
  background: #3bb54a !important;
  border: 2px solid #217a2b;
}
.fp-assister {
  background: #ff9800 !important;
  border: 2px solid #b36a00;
}
.fp-selected-btn {
  box-shadow: 0 0 0 3px #54a6e3;
  border: 2px solid #357ab8;
}
/* Valittu pelaaja-nappi */
.fp-selected {
  background: #3bb54a !important;
  border: 2px solid #217a2b;
}
/* Sininen tausta ja boldattu teksti uusille napeille */
.fp-blue-bold {
  background: #54a6e3 !important;
  color: #fff;
  font-weight: bold;
}
/* Kopioitu fp-sivun CSS: */
.fp-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
}
.fp-grid {
  display: flex;
  justify-content: center;
  gap: 0.7rem;
  margin-bottom: 0.7rem;
}
.fp-row-maalivahti {
  margin-bottom: 1.2rem;
}
.fp-row-yla, .fp-row-ala {
  margin-bottom: 0.2rem;
}
.fp-col {
  flex: 1;
  display: flex;
  justify-content: center;
}
.fp-btn {
  background: #54a6e3;
  color: black !important;
  border: none;
  border-radius: 12px;
  padding: 0.35rem 1.2rem;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  margin: 0.1rem;
  transition: background 0.2s;
  min-width: 120px;
}
.fp-btn:active {
  background: #357ab8;
}
.fp-kentta {
  margin-bottom: 0.7rem;
}
.fp-kentta-title {
  font-weight: 500;
  margin-bottom: 0.1rem;
  margin-left: 0.5rem;
}
.fp-row-maalivahti .fp-btn {
  min-width: 120px;
}
.fp-btn[disabled] {
  background: #ccc;
  color: #666;
  cursor: not-allowed;
}
.fp-actions {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
}
.fp-actions .fp-btn {
  background: #888;
}
.fp-actions .fp-btn.save {
  background: #54a6e3;
}
</style>
