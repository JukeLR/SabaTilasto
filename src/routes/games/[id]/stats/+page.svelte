<script lang="ts">
      function openShots(title: string) {
        const id = $page.data.id ?? $page.params.id;
        goto(`/games/${id}/stats/shot?title=${encodeURIComponent(title)}`);
      }
    let teamGoals: any[] = [];
    let opponentGoals: any[] = [];
  import { onMount } from 'svelte';
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';
  import { playerNames, fetchAndUpdatePlayerNames } from '$lib/stores/playerNames';
  import { get } from 'svelte/store';
  let maalivahtiNimi = "";
  let vastustajaNimi = "";
  let pollingInterval: any;

  async function fetchGameAndPlayers() {
    const id = $page.params.id ?? $page.data.id;
    const res = await fetch(`/api/games/${id}?basic=true`);
    const data = await res.json();
    vastustajaNimi = data.opponentName || "";
    gameLineup.set(data.lineup || []);
    gameFieldPositions.set(data.fieldPositions || []);
    await fetchAndUpdatePlayerNames(data.lineup || []);
    teamGoals = data.team_goals || [];
    opponentGoals = data.opponent_goals || [];
    const goalieId = data.fieldPositions?.[0];
    if (goalieId) {
      const names = get(playerNames);
      maalivahtiNimi = names[goalieId] || "";
    }
  }

  onMount(() => {
    fetchGameAndPlayers();
    pollingInterval = setInterval(fetchGameAndPlayers, 3000);
    return () => clearInterval(pollingInterval);
  });

  function openKentalliset() {
    const id = $page.data.id ?? $page.params.id;
    goto(`/games/${id}/stats/fp`);
  }
</script>

<main class="stats-main">
  <button class="field-btn" on:click={openKentalliset}>Kentälliset</button>

  <div class="score-row">
    <span class="score-label">Maalivahti: {maalivahtiNimi}</span>
  </div>
  <div class="score-row">
    <span class="score-label">Vastustaja: {vastustajaNimi}</span>
  </div>

  <div class="score-row">
    <div class="stat-col">
      <div class="stat-label">Maali meille</div>
      <button class="stat-btn green" on:click={() => openShots('Maali meille')}>{teamGoals.length}</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Maali vastustajalle</div>
      <button class="stat-btn orange">{opponentGoals.length}</button>
    </div>
  </div>

  <div class="score-row three-cols">
    <div class="stat-col">
      <div class="stat-label">Veto maalia kohti</div>
      <button class="stat-btn green">0</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Veto ohi</div>
      <button class="stat-btn yellow">0</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Torjunta</div>
      <button class="stat-btn yellow">0</button>
    </div>
  </div>

  <div class="score-row">
    <div class="stat-col">
      <div class="stat-label">Blokki</div>
      <button class="stat-btn green">0</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Syöttökatko</div>
      <button class="stat-btn green">0</button>
    </div>
  </div>

  <div class="score-row">
    <div class="stat-col">
      <div class="stat-label">Torjunta</div>
      <button class="stat-btn green">0</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Maalivahdin katko</div>
      <button class="stat-btn green">0</button>
    </div>
  </div>

  <button class="end-btn">Lopeta peli</button>
</main>

<style>
  .stats-main {
    max-width: 400px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    min-height: 100vh;
    background: #fff;
  }
  .field-btn {
    width: 100%;
    background: #5b9bd5;
    color: #fff;
    font-size: 1.2rem;
    font-weight: bold;
    border: none;
    border-radius: 16px;
    padding: 16px 0;
    margin-bottom: 8px;
  }
  .score-row {
    display: flex;
    width: 100%;
    gap: 16px;
    justify-content: center;
    margin-bottom: 4px;
  }
  .score-row.three-cols {
    gap: 8px;
  }
  .score-label {
    flex: 1;
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
    color: #222;
  }
  .stat-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .stat-label {
    text-align: center;
    font-size: 1rem;
    color: #111;
    font-weight: 500;
    margin-bottom: 0;
    line-height: 1.1;
  }
  .stat-btn {
    width: 100%;
    font-size: 2rem;
    font-weight: bold;
    border: none;
    border-radius: 16px;
    padding: 18px 0;
    margin: 0;
    min-width: 0;
    transition: box-shadow 0.2s;
    color: #111;
  }
  .stat-btn.green {
    background: #4caf50;
  }
  .stat-btn.orange {
    background: #f57c00;
  }
  .stat-btn.yellow {
    background: #fbc02d;
  }
  .end-btn {
    width: 100%;
    background: #5b9bd5;
    color: #fff;
    font-size: 1.2rem;
    font-weight: bold;
    border: none;
    border-radius: 16px;
    padding: 16px 0;
    margin-top: 24px;
  }
  @media (max-width: 500px) {
    .stats-main {
      max-width: 100vw;
      padding: 8px;
    }
    .field-btn, .end-btn {
      font-size: 1rem;
      padding: 12px 0;
    }
    .stat-btn {
      font-size: 1.3rem;
      padding: 12px 0;
    }
  }
</style>
