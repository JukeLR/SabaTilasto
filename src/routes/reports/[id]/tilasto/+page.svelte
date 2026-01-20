      
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
  let user = null;
  let userRole = '';
  let userTeamIds: number[] = [];
  let shotmap: Array<{ x: number; y: number; team: number; type: string; games_id: number; player_id?: number; xg?: number }> = [];
  let turnovermap: Array<{ x: number; y: number; team: number; type: string; games_id: number; player_id?: number }> = [];


  onMount(async () => {
    // Hae käyttäjä layoutin datasta
    const data = page && page.subscribe ? (await new Promise<any>(res => {
      let unsub: (() => void) | undefined;
      unsub = page.subscribe(val => { if (unsub) unsub(); res(val.data); });
    })) : {};
    user = data?.user || null;
    userRole = user?.role || '';
    userTeamIds = Array.isArray(user?.team_ids) ? user.team_ids.map((id: any) => Number(id)) : [];
    gameId = $page.params.id ? $page.params.id : "";

    // Pelaaja-roolilla ilman player_id:tä ei haeta yhtään peliä eikä näytetä tilastoja
    if (userRole === 'pelaaja' && (!Array.isArray(user?.player_ids) || user.player_ids.length === 0)) {
      error = 'Sinulla ei ole pelaajatunnusta, joten et näe yhtään peliä.';
      isLoading = false;
      game = null;
      players = [];
      shotmap = [];
      turnovermap = [];
      return;
    }

    await fetchGame();
    // Jos toimihenkilö, tarkista pääsy peliin
    if (userRole === 'toimihenkilö' && game && !userTeamIds.includes(Number(game.own_team_id))) {
      error = 'Sinulla ei ole oikeuksia nähdä tämän pelin tilastoja.';
      return;
    }
    await fetchPlayers();

    // Hae shotmap-pisteet tälle pelille
    try {
      const res = await fetch(`/api/shotmap?games_id=${gameId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Suodata vain tämän pelin pisteet
        shotmap = data.filter((row: any) => Number(row.games_id) === Number(gameId));
      }
    } catch (e) {
      // Ei virheilmoitusta
    }
    
    // Hae turnovermap-pisteet tälle pelille
    try {
      const res = await fetch(`/api/turnovermap?games_id=${gameId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        // Suodata vain tämän pelin pisteet
        turnovermap = data.filter((row: any) => Number(row.games_id) === Number(gameId));
      } 
    } catch (e) {
        // Ei virheilmoitusta
    }
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
        players = (data.players || []).map(p => ({ ...p, id: Number(p.id) }));
        // Lisää goalie_change-pelaaja listaan jos löytyy ja ei jo mukana
        if (game && typeof game.goalie_change === 'number' && game.goalie_change > 0) {
          const goalieId = game.goalie_change;
          if (!players.find(p => p.id === goalieId)) {
            // Hae maalivahti id:llä
            const res = await fetch(`/api/players/${goalieId}`);
            const playerData = await res.json();
            if (res.ok && playerData && playerData.id) {
              players = [...players, playerData];
            }
          }
        }
        // Pelaaja-roolilla näytetään vain sidotun pelaajan tilastot
        if (userRole === 'pelaaja' && Array.isArray(user?.player_ids) && user.player_ids.length > 0) {
          const allowedId = Number(user.player_ids[0]);
          players = players.filter(p => p.id === allowedId);
        }
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

  // Laske pelaajakohtainen xG tämän pelin shotmapista (team!=0)

  // Pelaajakohtainen xG tulee backendistä playerXG-oliona

  export let homeXG;
  export let awayXG;
  export let xgError: string | null;
  export let data;

  let showGoals = true;
  let showShotsOnGoal = true;
  let showBlocks = true;
  let showShotsOffTarget = true;
  let showTurnoverGoal = true;
  let showTurnoverNoGoal = true;
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
            <th>Vedot<br/>kohti maalia</th>
            <th>Vedot<br/>ohi maalin</th>
            <th>Vedot<br/>blokkiin</th>
            <th>Blokit</th>
            <th>Plussat</th>
            <th>Miinukset</th>
            <th>Torjunnat</th>
            <th>Päästetyt<br/>maalit</th>
            <th>Maalivahdin<br/>katkot</th>
            <th>Torjunta-%</th>
            <th>xG</th>
          </tr>
        </thead>
        <tbody>
          {#each players as p}
            <tr>
              <td class="name-col">
                {#if userRole === 'admin' || userRole === 'vastuuvalmentaja'}
                  <a href={`/reports/${gameId}/tilasto/${p.id}`}>{p.first_name} {p.last_name}</a>
                {:else}
                  {p.first_name} {p.last_name}
                {/if}
              </td>
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
              <td>{data?.playerXG && data.playerXG[Number(p.id)] !== undefined && data.playerXG[Number(p.id)] !== null ? Number(data.playerXG[Number(p.id)]).toFixed(2) : '0.00'}</td>
            </tr>
          {/each}
          {#if userRole !== 'pelaaja'}
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
            <td>{players.reduce((sum, p) => sum + (data?.playerXG && data.playerXG[Number(p.id)] !== undefined && data.playerXG[Number(p.id)] !== null ? Number(data.playerXG[Number(p.id)]) : 0), 0).toFixed(2)}</td>
          </tr>
          {/if}
        </tbody>
      </table>
    
      
    </div>    
      {#if (
        ((data.homeXG !== undefined && data.homeXG !== null) || (data.awayXG !== undefined && data.awayXG !== null)) &&
        !(Number(data.homeXG) === 0 && Number(data.awayXG) === 0)
      )}
        <h2>Ottelun maaliodottama (xG)</h2>
        <div style="font-size:1.3rem; font-weight:bold; color:#222;">
          <p>{game?.ownTeamName ?? 'Koti'} xG: {data.homeXG !== undefined && data.homeXG !== null ? Number(data.homeXG).toFixed(2) : '–'}</p>      
          <p>{game?.opponentName ?? 'Vieras'} xG: {data.awayXG !== undefined && data.awayXG !== null ? Number(data.awayXG).toFixed(2) : '–'}</p>
        </div>
      {/if}
      
      {#if xgError}
        <div class="error-message">xG-virhe: {xgError}</div>
      {/if}
  {/if}
</div>
<!-- Toimintonapit kenttäkuvan yläpuolelle -->
<!-- {#if game && Array.isArray(shotmap) && shotmap.length > 0} -->
  <div class="field-controls" style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap;">
    <button class:active-btn={showGoals} on:click={() => showGoals = !showGoals}>Maalit</button>
    <button class:active-btn={showShotsOnGoal} on:click={() => showShotsOnGoal = !showShotsOnGoal}>Vedot kohti maalia</button>
    <button class:active-btn={showBlocks} on:click={() => showBlocks = !showBlocks}>Blokit</button>
    <button class:active-btn={showShotsOffTarget} on:click={() => showShotsOffTarget = !showShotsOffTarget}>Vedot ohimaalin</button>
    <button class:active-btn={showTurnoverGoal} on:click={() => showTurnoverGoal = !showTurnoverGoal}>Pelinkäännöt<br/>(maalit)</button>
    <button class:active-btn={showTurnoverNoGoal} on:click={() => showTurnoverNoGoal = !showTurnoverNoGoal}>Pelinkäännöt<br/>(ei maalia)</button>
  </div>
<!-- {/if} -->
<!-- {#if game && Array.isArray(shotmap) && shotmap.length > 0} -->
  <div style="width:100%; ">
    <div style="display:flex; justify-content:space-between; align-items:left; max-width:1200px;">
      <div style="font-size:1.3rem; font-weight:bold; color:#222;">{game?.ownTeamName ?? ''}</div>
      <div style="font-size:1.3rem; font-weight:bold; color:#222;">{game?.opponentName ?? ''}</div>
    </div>
    <div class="kentta-container-fit">
      <img src="/Kentta.svg" alt="Kenttä" class="kentta-img-fit" />
      {#if userRole === 'pelaaja' && Array.isArray(user?.player_ids) && user.player_ids.length > 0}
        {#each shotmap.filter(pt => Number(pt.player_id) === Number(user.player_ids[0]))
          .filter(pt =>
            (showGoals && pt.type === 'M') ||
            (showShotsOnGoal && pt.type === 'K') ||
            (showBlocks && (pt.type === 'B' || pt.type === 'BLOCK')) ||
            (showShotsOffTarget && (pt.type === 'O' || pt.type === 'OFF_TARGET'))
          ) as point}
          <svg
            class="kentta-overlay-fit"
            style="left:{point.x * 100}%; top:{100 - point.y * 100}%; transform:translate(-50%,-50%);"
            width="32" height="32" viewBox="0 0 32 32"
          >
            <text x="16" y="22" text-anchor="middle" font-size="14" font-weight="bold" fill={point.team === 1 ? 'green' : 'red'}>{point.type}</text>
          </svg>
        {/each}
        {#each turnovermap.filter(pt => Number(pt.player_id) === Number(user.player_ids[0]))
          .filter(pt =>
            (showTurnoverGoal && pt.type === 'TG') ||
            (showTurnoverNoGoal && pt.type === 'to')            
          ) as point}
          <svg
            class="kentta-overlay-fit"
            style="left:{point.x * 100}%; top:{100 - point.y * 100}%; transform:translate(-50%,-50%);"
            width="32" height="32" viewBox="0 0 32 32"
          >
            <text x="16" y="22" text-anchor="middle" font-size="14" font-weight="bold" fill={point.team === 1 ? 'green' : 'red'}>{point.type}</text>
          </svg>
        {/each}
      {:else}
        {#each shotmap.filter(pt =>
            (showGoals && pt.type === 'M') ||
            (showShotsOnGoal && pt.type === 'K') ||
            (showBlocks && (pt.type === 'B' || pt.type === 'BLOCK')) ||
            (showShotsOffTarget && (pt.type === 'O' || pt.type === 'OFF_TARGET'))
          ) as point}
          <svg
            class="kentta-overlay-fit"
            style="left:{point.x * 100}%; top:{100 - point.y * 100}%; transform:translate(-50%,-50%);"
            width="32" height="32" viewBox="0 0 32 32"
          >
            <text x="16" y="22" text-anchor="middle" font-size="14" font-weight="bold" fill={point.team === 1 ? 'green' : 'red'}>{point.type}</text>
          </svg>
        {/each}
        {#each turnovermap.filter(pt =>
            (showTurnoverGoal && pt.type === 'TG') ||
            (showTurnoverNoGoal && pt.type === 'to')            
          ) as point}
          <svg
            class="kentta-overlay-fit"
            style="left:{point.x * 100}%; top:{100 - point.y * 100}%; transform:translate(-50%,-50%);"
            width="32" height="32" viewBox="0 0 32 32"
          >
            <text x="16" y="22" text-anchor="middle" font-size="14" font-weight="bold" fill={point.team === 1 ? 'green' : 'red'}>{point.type}</text>
          </svg>
        {/each}
      {/if}
    </div>
  </div>
<!-- {/if} -->

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

  .kentta-container-fit {
    position: relative;
    max-width: 1200px;
    width: 100%;
    margin: 20px 0;
    display: block;
  }
  .kentta-img-fit {
    display: block;
    width: 100%;
    height: auto;
    padding: 0;
    margin: 0;
    border: none;
    max-width: 1200px;
  }
  .kentta-overlay-fit {
    position: absolute;
    z-index: 2;
    pointer-events: none;
  }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      overflow: auto;
      display: block;
      
    }
    .stats-table th, .stats-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
      background: #fff;
    }
    .stats-table tbody tr:nth-child(even) td {
      background: #f6f6f6 !important;
    }
    .stats-table tbody tr:nth-child(even) td:first-child {
      background: #e0e0e0 !important;
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
  .field-controls button {
    padding: 8px 18px;
    border-radius: 8px;
    border: 1px solid #bbb;
    background: #f5f5f5;
    color: #222;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.18s, color 0.18s;
    margin-right: 6px;
    margin-bottom: 6px;
  }
  .field-controls button.active-btn {
    background: #5b9bd5;
    color: #fff;
    border: 1.5px solid #357ab8;
  }
</style>


