<script lang="ts">
import { writable, get } from 'svelte/store';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { onMount } from 'svelte';
import { lineupPlayersStore, fetchLineupPlayers } from '$lib/stores/lineupPlayers';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';

let title = 'Veto blokkiin';
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

async function saveShotBlocked() {
  const gameId = $page.params.id;
  const payload: Record<string, any> = {};
  payload.shots_blocked = $selectedPlayer !== null ? [$selectedPlayer] : [];
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
  <button class="fp-btn fp-save" on:click={saveShotBlocked} disabled={$selectedPlayer === null}>Tallenna</button>
  <button class="fp-btn fp-cancel" on:click={() => goto(`/games/${get(page).params.id}/stats`)}>Peruuta</button>
</main>

<style>
.fp-main { max-width: 400px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; align-items: center; }
.fp-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.fp-col { flex: 1; min-width: 100px; }
.fp-btn { width: 100%; font-size: 0.95rem; border-radius: 6px; padding: 7px 0; margin-bottom: 2px; border: 1px solid #ccc; background: #eee; cursor: pointer; }
.fp-selected { background: #4caf50; color: #fff; }
.fp-save { background: #2196f3; color: #fff; font-weight: bold; }
.fp-cancel { background: #aaa; color: #fff; font-weight: bold; margin-top: 8px; }
</style>
