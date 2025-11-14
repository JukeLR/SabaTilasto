<script lang="ts">
      function openShots(title: string) {
        const id = $page.data.id ?? $page.params.id;
        goto(`/games/${id}/stats/shot?title=${encodeURIComponent(title)}`);
      }
      function openOpponentShots(title: string) {
        const id = $page.data.id ?? $page.params.id;
        goto(`/games/${id}/stats/opponent-shot?title=${encodeURIComponent(title)}`);
      }
    let teamGoals: any[] = [];
    let opponentGoals: any[] = [];
    let shotsOnGoal: any[] = [];
    let shotsOffTarget: any[] = [];
    let shotsBlocked: any[] = [];
    let blocks: any[] = [];
    let saves: any[] = [];
    let goalieGameInterruption: any[] = [];
    let opponentShotOff = 0;
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
    shotsOnGoal = data.shots_on_goal || [];
    shotsOffTarget = data.shots_off_target || [];
    shotsBlocked = data.shots_blocked || [];
    blocks = data.blocks || [];
    saves = data.saves || [];
    goalieGameInterruption = data.goalie_game_interruption || [];
    opponentShotOff = typeof data.opponent_shots_off === 'number' ? data.opponent_shots_off : 0;
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

  async function increaseOpponentShotsOff() {
    const id = $page.params.id ?? $page.data.id;
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent_shots_off: 1 }),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchGameAndPlayers(); // Päivitä näkymä
      } else {
        alert('Tallennus epäonnistui');
      }
    } catch (e) {
      alert('Tallennusvirhe: ' + e);
    }
  }

  let opponentShotOffPressed = false;
  let savePressed = false;
  let goalieInterruptionPressed = false;

  async function handleOpponentShotsOffClick() {
    opponentShotOffPressed = true;
    setTimeout(() => { opponentShotOffPressed = false; }, 50);
    await increaseOpponentShotsOff();
  }

  async function handleSaveClick() {
    savePressed = true;
    setTimeout(() => { savePressed = false; }, 50);
    // Hae maalivahdin id
    const id = $page.params.id ?? $page.data.id;
    const goalieId = gameFieldPositions && get(gameFieldPositions)[0];
    if (!goalieId) {
      alert('Maalivahdin id ei löytynyt');
      return;
    }
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saves: goalieId }),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchGameAndPlayers();
      } else {
        alert('Tallennus epäonnistui');
      }
    } catch (e) {
      alert('Tallennusvirhe: ' + e);
    }
  }

  async function handleGoalieInterruptionClick() {
    goalieInterruptionPressed = true;
    setTimeout(() => { goalieInterruptionPressed = false; }, 50);
    const id = $page.params.id ?? $page.data.id;
    const goalieId = gameFieldPositions && get(gameFieldPositions)[0];
    if (!goalieId) {
      alert('Maalivahdin id ei löytynyt');
      return;
    }
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalie_game_interruption: goalieId }),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchGameAndPlayers();
      } else {
        alert('Tallennus epäonnistui');
      }
    } catch (e) {
      alert('Tallennusvirhe: ' + e);
    }
  }

  async function handleEndGameClick() {
    const id = $page.params.id ?? $page.data.id;
    try {
      const res = await fetch(`/api/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Pelattu' }),
        credentials: 'include'
      });
      if (res.ok) {
        goto('/games');
      } else {
        alert('Pelin lopetus epäonnistui');
      }
    } catch (e) {
      alert('Pelin lopetusvirhe: ' + e);
    }
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
      <button class="stat-btn orange" on:click={() => openOpponentShots('Maali vastustajalle')}>{opponentGoals.length}</button>
    </div>
  </div>

  <div class="score-row three-cols" style="display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem;">
    <div class="stat-col" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
      <div class="stat-label">Veto maalia kohti</div>
      <button class="stat-btn green" on:click={() => goto(`/games/${get(page).params.id}/stats/shot-on-goal`)}>{shotsOnGoal.length}</button>
    </div>
    <div class="stat-col" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
      <div class="stat-label">Veto ohi<br />maalin</div>
      <button class="stat-btn yellow" on:click={() => goto(`/games/${get(page).params.id}/stats/shot-off-target`)}>{shotsOffTarget.length}</button>
    </div>
    <div class="stat-col" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
      <div class="stat-label" style="text-align:center;">
        Veto<br />blokkiin
      </div>
      <button class="stat-btn yellow" on:click={() => goto(`/games/${get(page).params.id}/stats/shot-blocked`)}>{shotsBlocked.length}</button>
    </div>
  </div>

  <div class="score-row">
    <div class="stat-col">
      <div class="stat-label">Vastustajan veto<br />blokattu</div>
      <button class="stat-btn green" on:click={() => goto(`/games/${get(page).params.id}/stats/block`)}>{blocks.length}</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Vastustajan veto ohi maalin</div>
      <button class="stat-btn yellow" class:pressed={opponentShotOffPressed} on:click={handleOpponentShotsOffClick}>{opponentShotOff}</button>
    </div>
  </div>

  <div class="score-row">
    <div class="stat-col">
      <div class="stat-label">Torjunta</div>
      <button class="stat-btn green" class:pressed={savePressed} on:click={handleSaveClick}>{saves.length}</button>
    </div>
    <div class="stat-col">
      <div class="stat-label">Maalivahdin katko</div>
      <button class="stat-btn green" class:pressed={goalieInterruptionPressed} on:click={handleGoalieInterruptionClick}>{goalieGameInterruption.length}</button>
    </div>
  </div>

  <button class="end-btn" on:click={handleEndGameClick}>Lopeta peli</button>
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
  .pressed {
    background: #c4901c !important;
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
