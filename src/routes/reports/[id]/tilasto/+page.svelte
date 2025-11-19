<script lang="ts">
    function getPlayerMinuses(playerId: number) {
      if (!game || !Array.isArray(game.minus_points)) return 0;
      return game.minus_points.filter((id: any) => Number(id) === playerId).length;
    }
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let gameId = "";
  let game: any = null;
  let players: any[] = [];
  let isLoading: boolean = true;
  let error: string = "";

  onMount(async () => {
    gameId = $page.params.id ? $page.params.id : "";
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
    window.location.href = "/games";
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

  function getPlayerPlusses(playerId: number) {
    if (!game || !Array.isArray(game.plus_points)) return 0;
    return game.plus_points.filter((id: any) => Number(id) === playerId).length;
  }

  function getPlusNames() {
    if (!game || !Array.isArray(game.plus_points) || !Array.isArray(players)) return [];
    return game.plus_points.map((id: number) => {
      const player = players.find(p => p.id === id);
      return player ? `${player.last_name} ${player.first_name}` : id;
    });
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
      <p><strong>Vastustajan maalivahdin torjunnat:</strong> {Array.isArray(game.shots_on_goal) ? game.shots_on_goal.length : 0}</p>
      <p><strong>Vastustajan vedot ohi maalin:</strong> {typeof game.opponent_shots_off === 'number' ? game.opponent_shots_off : 0}</p>
      <p><strong>Tulos:</strong> <span class="score"><strong>{game.ownTeamName}</strong></span> <span class="score"><strong>{Array.isArray(game.team_goals) ? game.team_goals.length : 0}</strong></span><span class="score">-</span><span class="score"><strong>{Array.isArray(game.opponent_goals) ? game.opponent_goals.length:0}</strong></span> <span class="score"><strong>{game.opponentName}</strong></span></p>
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
            <th>Plussat</th>
            <th>Miinukset</th>
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
              <td>{getPlayerPlusses(p.id)}</td>
              <td>{getPlayerMinuses(p.id)}</td>
              <td>{getPlayerSaves(p.id)}</td>
              <td>{getPlayerGoalsAgainst(p.id)}</td>
              <td>{getPlayerGoalieInterruptions(p.id)}</td>
              <td>{getPlayerSavePercentage(p.id)}</td>
            </tr>
          {/each}
          <tr style="font-weight: bold; background: #f2f2f2;">
            <td>Yhteensä</td>
            <td>{players.reduce((sum, p) => sum + getPlayerGoals(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerAssists(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerShotsOnGoal(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerShotsOffTarget(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerShotsBlocked(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerBlocks(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerPlusses(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerMinuses(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerSaves(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerGoalsAgainst(p.id), 0)}</td>
            <td>{players.reduce((sum, p) => sum + getPlayerGoalieInterruptions(p.id), 0)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .btn-back {
    padding: 15px 50px;
		background-color: #5b9bd5;
		color: white;
		border: none;
		border-radius: 10px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 160px;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      overflow: auto;
      display: block;
      max-height: 500px;
    }
    .stats-table th, .stats-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
      background: #fff;
    }
    .stats-table td {
      font-size: 1.25rem;
    }
    .stats-table th,
    .stats-table td:first-child,
    .stats-table th:first-child {
      font-size: 1rem;
    }
    .stats-table th {
      background: #f2f2f2;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .stats-table td:first-child, .stats-table th:first-child {
      position: sticky;
      left: 0;
      background: #e9e9e9;
      z-index: 3;
    }
  h1 {
    color: #1a1a1a;
    font-size: 2rem;
    margin-bottom: 30px;
  }
  .score {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 0 0px;
    color: #1a1a1a;
    vertical-align: middle;
  }
  .loading {
    color: #555;
    font-size: 1.1rem;
    margin: 20px 0;
  }
</style>
