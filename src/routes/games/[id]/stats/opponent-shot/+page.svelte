<script lang="ts">
import { opponentGoals } from '$lib/stores/opponentGoals';
import { get as getStore } from 'svelte/store';
import { writable, get, derived } from 'svelte/store';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { lineupPlayersStore, fetchLineupPlayers } from '$lib/stores/lineupPlayers';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';

let showGoalAssistSelected = false;
let showPlusSelected = false;

let selectionPhase = writable<'plusmiinus' | 'maali'>('plusmiinus');
let selectedPlayers = writable<number[]>([]);
let minusPlayers: number[] = [];
let selectedGoal: number | 'TM' | null = null;
let title = 'Maali vastustajalle';

const fieldPositions = gameFieldPositions;
const lineupPlayers = lineupPlayersStore;

onMount(() => {
  const params = get(page);
  const lineup = get(gameLineup);
  fetchLineupPlayers(lineup);
});

function togglePlayerSelection(playerId: number) {
  if ($selectionPhase === 'plusmiinus') {
    selectedPlayers.update(selected => selected.includes(playerId)
      ? selected.filter(id => id !== playerId)
      : [...selected, playerId]);
  } else if ($selectionPhase === 'maali') {
    // Maalivahti tai tyhjä maali
    if (playerId === -1) {
      selectedGoal = selectedGoal === 'TM' ? null : 'TM';
    } else {
      selectedGoal = selectedGoal === playerId ? null : playerId;
    }
  }
}

function handlePlusMiinus() {
  minusPlayers = [...$selectedPlayers];
  selectionPhase.set('maali');
  selectedPlayers.set([]);
  // Jos ei valittu yhtään miinuspelaajaa, näytä vihreä nappi
  if (minusPlayers.length === 0) {
    showPlusSelected = true;
  } else {
    showPlusSelected = false;
  }
}

async function saveOpponentGoal() {
  const gameId = get(page).params.id;
  const payload: Record<string, any> = {};
  // Miinuspelaajat
  if (minusPlayers.length > 0) payload.minus_points = minusPlayers;
  // Maali
  if (selectedGoal === 'TM') {
    payload.opponent_goals = ['TM'];
  } else if (selectedGoal !== null) {
    payload.opponent_goals = [selectedGoal.toString()];
  }
  try {
    const res = await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (res.ok) {
      // Päivitä opponentGoals-store heti, jotta stats-nappi päivittyy nopeasti
      if (payload.opponent_goals) {
        const prevGoals = getStore(opponentGoals);
        opponentGoals.set([...prevGoals, ...payload.opponent_goals]);
      }
      goto(`/games/${gameId}/stats`);
    } else {
      alert('Tallennus epäonnistui');
    }
  } catch (e) {
    alert('Tallennusvirhe: ' + e);
  }
}
</script>

<main class="fp-main">
  <h2>{title}</h2>
  <div class="fp-grid fp-row-maalivahti">
    <div class="fp-col">
      {#if $fieldPositions && $lineupPlayers}
        <button class="fp-btn { $selectionPhase === 'maali' && selectedGoal === $fieldPositions[0] ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection($fieldPositions[0])}>
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
    <div class="fp-col">
      <button class="fp-btn { $selectionPhase === 'maali' && selectedGoal === 'TM' ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection(-1)}>Tyhjä maali</button>
    </div>
  </div>
  {#each [0,1,2,3] as kenttaIdx}
    <div class="fp-kentta">
      <div class="fp-kentta-title">{kenttaIdx + 1}. kenttä</div>
      <div class="fp-grid fp-row-yla">
        {#each [0,1,2] as j}
          <div class="fp-col">
            {#if $fieldPositions && $lineupPlayers}
              <button class="fp-btn { $selectionPhase === 'plusmiinus' && $selectedPlayers.includes($fieldPositions[1 + kenttaIdx * 5 + j]) ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection($fieldPositions[1 + kenttaIdx * 5 + j])}>
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
              <button class="fp-btn { $selectionPhase === 'plusmiinus' && $selectedPlayers.includes($fieldPositions[1 + kenttaIdx * 5 + 3 + j]) ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection($fieldPositions[1 + kenttaIdx * 5 + 3 + j])}>
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
      <button class="fp-btn { showPlusSelected ? 'fp-green-btn' : ($selectionPhase === 'maali' && minusPlayers.length > 0 ? 'fp-green-btn' : 'fp-blue-bold') }" on:click={handlePlusMiinus}><b>+/-</b></button>
    </div>
  </div>
  <div class="fp-col">
    <button class="fp-btn fp-blue-bold" on:click={saveOpponentGoal}><b>Tallenna</b></button>
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
.fp-blue-bold {
  background: #54a6e3 !important;
  color: #fff;
  font-weight: bold;
}
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
.fp-actions {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
}
.fp-actions .fp-btn {
  background: #888;
}
</style>
