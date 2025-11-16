<script lang="ts">
import { writable, get } from 'svelte/store';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { lineupPlayersStore, fetchLineupPlayers } from '$lib/stores/lineupPlayers';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';

let title = 'Veto maalia kohti';
const fieldPositions = gameFieldPositions;
const lineupPlayers = lineupPlayersStore;
const selectedPlayer = writable<number | null>(null);

onMount(() => {
  const lineup = get(gameLineup);
  fetchLineupPlayers(lineup);
});

function togglePlayerSelection(playerId: number) {
  selectedPlayer.set($selectedPlayer === playerId ? null : playerId);
}

async function saveShotOnGoal() {
  const gameId = $page.params.id;
  const payload: Record<string, any> = {};
  payload.shots_on_goal = $selectedPlayer !== null ? [$selectedPlayer] : [];
  try {
    const res = await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    if (res.ok) {
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
        <button class="fp-btn { $selectedPlayer === $fieldPositions[0] ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection($fieldPositions[0])}>
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
              <button class="fp-btn { $selectedPlayer === $fieldPositions[1 + kenttaIdx * 5 + j] ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection($fieldPositions[1 + kenttaIdx * 5 + j])}>
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
              <button class="fp-btn { $selectedPlayer === $fieldPositions[1 + kenttaIdx * 5 + 3 + j] ? 'fp-selected' : '' }" on:click={() => togglePlayerSelection($fieldPositions[1 + kenttaIdx * 5 + 3 + j])}>
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
      <button class="fp-btn fp-cancel" on:click={() => goto(`/games/${$page.params.id}/stats`)}>Takaisin</button>
    </div>
    <div class="fp-col">
      <button class="fp-btn fp-blue-bold" on:click={saveShotOnGoal}><b>Tallenna</b></button>
    </div>
  </div>
</main>

<style>
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
  color: black;
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
.fp-blue-bold {
  background: #54a6e3 !important;
  color: #fff;
  font-weight: bold;
}
.fp-actions {
  display: flex;
  justify-content: center;
  .fp-selected { background: #4caf50; color: #fff; }
  .fp-save { background: #2196f3; color: #fff; font-weight: bold; }
  .fp-cancel { background: #aaa; color: #fff; font-weight: bold; margin-top: 8px; }
  gap: 2rem;
  margin-top: 2rem;
}
.fp-actions .fp-btn {
  background: #888;
}
.fp-selected {
  background: #3bb54a !important;
  border: 2px solid #217a2b;
}
</style>
