<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let gameId: string = "";
  let game: any = null;
  let players: any[] = [];
  let isLoading: boolean = true;
  let error: string = "";

  onMount(async () => {
    gameId = $page.params.id;
    await fetchGame();
    await fetchPlayers();
  });

  async function fetchGame() {
    try {
      isLoading = true;
      error = "";
      const response = await fetch(`/api/games/${gameId}`);
      const data = await response.json();
      if (response.ok) {
        game = data;
      } else {
        error = data.error || "Pelin haku epäonnistui";
      }
    } catch (err) {
      error = "Yhteysvirhe. Yritä uudelleen.";
    } finally {
      isLoading = false;
    }
  }

  async function fetchPlayers() {
    try {
      const response = await fetch(`/api/games/${gameId}/players`);
      const data = await response.json();
      if (response.ok) {
        players = data.players || [];
      }
    } catch (err) {
      // Ei virheilmoitusta pelaajille
    }
  }

  function goBackToReports() {
    window.location.href = "/reports";
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function getPlayerGoals(playerId: number) {
    if (!game || !Array.isArray(game.team_goals)) return 0;
    return game.team_goals.filter((id: string | number) => Number(id) === playerId).length;
  }

  function getPlayerShotsOnGoal(playerId: number) {
    if (!game || !Array.isArray(game.shots_on_goal)) return 0;
    return game.shots_on_goal.filter((id: number) => id === playerId).length;
  }

  function getPlayerShotsOffTarget(playerId: number) {
    if (!game || !Array.isArray(game.shots_off_target)) return 0;
    return game.shots_off_target.filter((id: number) => id === playerId).length;
  }

  function getPlayerShotsBlocked(playerId: number) {
    if (!game || !Array.isArray(game.shots_blocked)) return 0;
    return game.shots_blocked.filter((id: number) => id === playerId).length;
  }

  function getPlayerBlocks(playerId: number) {
    if (!game || !Array.isArray(game.blocks)) return 0;
    return game.blocks.filter((id: number) => id === playerId).length;
  }

  function getPlayerAssists(playerId: number) {
    if (!game || !Array.isArray(game.assists)) return 0;
    return game.assists.filter((id: number) => id === playerId).length;
  }

  function getPlayerSaves(playerId: number) {
    if (!game || !Array.isArray(game.saves)) return 0;
    return game.saves.filter((id: number) => id === playerId).length;
  }

  function getPlayerGoalsAgainst(playerId: number) {
    if (!game || !Array.isArray(game.opponent_goals)) return 0;
    // opponent_goals is array of text, each text should be player id as string
    return game.opponent_goals.filter((id: string) => Number(id) === playerId).length;
  }

  function getPlayerGoalieInterruptions(playerId: number) {
    if (!game || !Array.isArray(game.goalie_game_interruption)) return 0;
    return game.goalie_game_interruption.filter((id: number) => id === playerId).length;
  }

  function getPlayerSavePercentage(playerId: number) {
    const saves = getPlayerSaves(playerId);
    const goalsAgainst = getPlayerGoalsAgainst(playerId);
    const total = saves + goalsAgainst;
    if (total === 0) return '';
    return ((saves / total) * 100).toFixed(1) + '%';
  }
</script>

<div class="container">
  <h1>Pelin tilasto</h1>
  <button class="btn-back" on:click={goBackToReports}>← Takaisin</button>
  {#if isLoading}
    <div class="loading">Ladataan pelin tietoja...</div>
  {:else if error}
    <div class="error-message">{error}</div>
  {:else if game}
    <div class="game-stats">
      <h2>Pelin tilastot</h2>
      <p><strong>Päivämäärä:</strong> {formatDate(game.gameDate)}</p>
      <p><strong>Pelipaikka:</strong> {game.gameLocation}</p>
      <p><strong>Vastustaja:</strong> {game.opponentName}</p>
      <p><strong>Tulos:</strong> <span class="score"><strong>{game.ownTeamName}</strong></span> <span class="score"><strong>{Array.isArray(game.team_goals) ? game.team_goals.length : 0}</strong></span> <span class="score">-</span> <span class="score"><strong>{Array.isArray(game.opponent_goals) ? game.opponent_goals.length : 0}</strong></span> <span class="score"><strong>{game.opponentName}</strong></span></p>
    </div>
    <div class="player-stats">
      <h2>Pelaajatilastot</h2>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Nimi</th>
            <th>Maalit</th>
            <th>Syötöt</th>
            <th>Vedot kohti maalia</th>
            <th>Vedot ohi maalin</th>
            <th>Vedot blokkiin</th>
            <th>Blokit</th>
            <th>Torjunnat</th>
            <th>Päästetyt maalit</th>
            <th>Maalivahdin katkot</th>
            <th>Torjunta-%</th>
          </tr>
        </thead>
        <tbody>
          {#each players as p}
            <tr>
              <td>{p.last_name} {p.first_name}</td>
              <td>{getPlayerGoals(p.id)}</td>
              <td>{getPlayerAssists(p.id)}</td>
              <td>{getPlayerShotsOnGoal(p.id)}</td>
              <td>{getPlayerShotsOffTarget(p.id)}</td>
              <td>{getPlayerShotsBlocked(p.id)}</td>
              <td>{getPlayerBlocks(p.id)}</td>
              <td>{getPlayerSaves(p.id)}</td>
              <td>{getPlayerGoalsAgainst(p.id)}</td>
              <td>{getPlayerGoalieInterruptions(p.id)}</td>
              <td>{getPlayerSavePercentage(p.id)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .stats-table th, .stats-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .stats-table th {
      background: #f2f2f2;
      font-weight: 600;
    }
  h1 {
    color: #1a1a1a;
    font-size: 2rem;
    margin-bottom: 30px;
  }
  .score {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0 8px;
    color: #1a1a1a;
    vertical-align: middle;
  }
  .loading {
    color: #555;
    font-size: 1.1rem;
    margin: 20px 0;
  }
</style>
