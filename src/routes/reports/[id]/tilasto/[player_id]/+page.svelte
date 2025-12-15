<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let playerId: string = '';
  let gameId: string = '';
  let player: any = null;
  let games: any[] = [];
  let stats: any = {};
  let game: any = null;
  let isLoading = true;
  let error = '';

  let user = null;
  let userRole = '';

  onMount(async () => {
    // Get user and params
    const data = page && page.subscribe ? (await new Promise<any>(res => {
      let unsub: (() => void) | undefined;
      unsub = page.subscribe(val => { if (unsub) unsub(); res(val.data); });
    })) : {};
    user = data?.user || null;
    userRole = user?.role || '';
    playerId = $page.params.player_id ?? '';
    gameId = $page.params.id ?? '';
    await fetchPlayerStats();
  });

  async function fetchPlayerStats() {
    isLoading = true;
    error = '';
    try {
      // Fetch player info and stats for this game
      const playerRes = await fetch(`/api/players/${playerId}`);
      let playerData = null;
      if (playerRes.ok) {
        playerData = await playerRes.json();
        player = playerData; // API returns player object directly
      } else {
        error = 'Pelaajan haku epäonnistui';
        isLoading = false;
        return;
      }

      // Hae pelin tiedot
      const gameRes = await fetch(`/api/games/${gameId}`);
      if (gameRes.ok) {
        game = await gameRes.json();
      } else {
        error = 'Pelin haku epäonnistui';
        isLoading = false;
        return;
      }

      // Laske tilastot pelin kentistä
      function countFromArray(arr, id) {
        if (!Array.isArray(arr)) return 0;
        return arr.filter((x) => Number(x) === Number(id)).length;
      }
      stats = {
        'Maalit': countFromArray(game.team_goals, playerId),
        'Syötöt': countFromArray(game.assists, playerId),
        'Vedot kohti maalia': countFromArray(game.shots_on_goal, playerId),
        'Vedot ohi maalin': countFromArray(game.shots_off_target, playerId),
        'Vedot blokkiin': countFromArray(game.shots_blocked, playerId),
        'Blokit': countFromArray(game.blocks, playerId),
        'Plussat': countFromArray(game.plus_points, playerId),
        'Miinukset': countFromArray(game.minus_points, playerId),
        'Torjunnat': countFromArray(game.saves, playerId),
        'Päästetyt maalit': countFromArray(game.opponent_goals, playerId)
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Virhe ladattaessa tietoja';
    } finally {
      isLoading = false;
    }
  }

  // Placeholder for button actions
  async function handlePlus(statType: string, gameId: string) {
    await updateStat(statType, gameId, 1);
  }
  async function handleMinus(statType: string, gameId: string) {
    await updateStat(statType, gameId, -1);
  }

  // Stat label to backend field mapping
  const statFieldMap: Record<string, string> = {
    'Maalit': 'team_goals',
    'Syötöt': 'assists',
    'Vedot kohti maalia': 'shots_on_goal',
    'Vedot ohi maalin': 'shots_off_target',
    'Vedot blokkiin': 'shots_blocked',
    'Blokit': 'blocks',
    'Plussat': 'plus_points',
    'Miinukset': 'minus_points',
    'Torjunnat': 'saves',
    'Päästetyt maalit': 'opponent_goals'
  };

  async function updateStat(statType: string, gameId: string, delta: number) {
    const field = statFieldMap[statType];
    if (!field) return;
    // Hae nykyinen array pelistä
    const res = await fetch(`/api/games/${gameId}`);
    if (!res.ok) return alert('Pelin haku epäonnistui');
    const gameData = await res.json();
    let arr = Array.isArray(gameData[field]) ? [...gameData[field]] : [];
    const pid = Number(playerId);
    arr = arr.map(Number).filter(x => !isNaN(x)); // Varmista että kaikki ovat numeroita ja poista null/NaN
    if (delta > 0) {
      arr.push(pid);
    } else {
      const idx = arr.lastIndexOf(pid);
      if (idx !== -1) {
        arr.splice(idx, 1);
      } else {
        return;
      }
    }
    // Poista mahdolliset null/NaN/undefined arvot vielä varmuuden vuoksi
    arr = arr.filter(x => typeof x === 'number' && !isNaN(x));
    // Päivitä backend
    const patchRes = await fetch(`/api/games/${gameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: arr })
    });
    if (!patchRes.ok) {
      alert('Päivitys epäonnistui');
      return;
    }
    // Päivitä näkymä
    await fetchPlayerStats();
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  const statLabels = [
    'Maalit',
    'Syötöt',
    'Vedot kohti maalia',
    'Vedot ohi maalin',
    'Vedot blokkiin',
    'Blokit',
    'Plussat',
    'Miinukset',
    'Torjunnat',
    'Päästetyt maalit'
  ];
</script>

{#if error}
  <div class="error-message">{error}</div>
{:else if isLoading}
  <div>Ladataan...</div>
{:else}
  <button class="back-btn" on:click={() => history.back()} style="margin-bottom: 12px;">&#8592; Takaisin</button>
  <h1>{player ? `${player.first_name} ${player.last_name}` : 'Pelaaja'}</h1>
  {#if game}
    <div class="game-info" style="margin-bottom: 4px; color: #555; font-size: 1.1em;">
      {game.ownTeamName} - {game.opponentName}
    </div>
    <div class="game-date" style="margin-bottom: 12px; color: #888; font-size: 1em;">
      {#if game.gameDate}
        {formatDate(game.gameDate)}
      {/if}
    </div>

  
  {/if}
  <table class="player-stats-table">
    <thead>
      <tr>
        <th>Tilasto</th>
        <th>Arvo</th>
        <th>Toiminnot</th>
      </tr>
    </thead>
    <tbody>
      {#each statLabels as label}
        <tr>
          <td>{label}</td>
          <td>{stats && stats[label] !== undefined ? stats[label] : '-'}</td>
          <td>
            <button on:click={() => handlePlus(label, gameId)}>+</button>
            <button on:click={() => handleMinus(label, gameId)}>-</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
.player-stats-table {
  width: auto;
  border-collapse: collapse;
  margin-top: 24px;
  table-layout: auto;
}


.player-stats-table th,
.player-stats-table td {
  padding: 4px 8px;
  font-size: 0.95em;
  white-space: nowrap;
}

/* Center only the value column (second column) */
.player-stats-table td:nth-child(2),
.player-stats-table th:nth-child(2) {
  text-align: center;
}

.player-stats-table th:first-child,
.player-stats-table td:first-child {
  min-width: 90px;
  text-align: left;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
.player-stats-table th, .player-stats-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}
.player-stats-table th {
  background: #f5f5f5;
}
.player-stats-table td button {
  margin-right: 8px;
  padding: 4px 10px;
  font-size: 1rem;
}
.back-btn {
  background: #f5f5f5;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 6px 18px;
  font-size: 1em;
  cursor: pointer;
  margin-bottom: 10px;
  transition: background 0.2s;
}
.back-btn:hover {
  background: #e0e0e0;
}
</style>
