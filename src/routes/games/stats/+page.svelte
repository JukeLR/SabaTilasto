<script lang="ts">
    let goalieNames: string[] = [];
    let playerNames: string[] = [];
      let goalieStats: Record<string, {
        name: string;
        games: number;
        wins: number;
        draws: number;
        losses: number;
        assists: number;
        saves: number;
        opponentGoals: number;
        interruptions: number;
        savePct?: string;
        goalsPerGame?: string;
        interruptionsPerGame?: string;
      }> = {};
let playerStats: Record<number, { id: number; name: string; games: number; wins: number; draws: number; losses: number; goals: number; assists: number; points: number; pointsPerGame: string; blocks: number; blocksPerGame: string; shotsOnGoal: number; shotsOnGoalPerGame: string; shotsBlocked: number; shotsBlockedPerGame: string; shotsOffTarget: number; shotsOffTargetPerGame: string; plus?: number; minus?: number }> = {};
let playerList: Array<{ id: number; name: string }> = [];

    async function fetchStats() {
      // ...existing code...
      // ...existing code...
      if (!selectedTeam) {
        alert('Valitse joukkue ennen hakua!');
        return;
      }
      // Hae maalivahdit
      const goaliesRes = await fetch(`/api/players?team_id=${selectedTeam}&position=Maalivahti`);
      const goaliesData = await goaliesRes.json();
      goalieNames = Array.isArray(goaliesData.players)
        ? goaliesData.players
            .slice()
            .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name))
            .map((p: any) => `${p.first_name} ${p.last_name}`)
        : [];
      // Hae kenttäpelaajat
      const playersRes = await fetch(`/api/players?team_id=${selectedTeam}&not_position=Maalivahti`);
      const playersData = await playersRes.json();
      playerNames = Array.isArray(playersData.players)
        ? playersData.players
            .slice()
            .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name))
            .map((p: any) => `${p.first_name} ${p.last_name}`)
        : [];

        // Pelaajien id->nimi map
        const playerIdMap: Record<number, string> = {};
        if (Array.isArray(playersData.players)) {
          for (const p of playersData.players) {
            playerIdMap[p.id] = `${p.first_name} ${p.last_name}`;
          }
        }

      // Hae kaikki pelit tälle joukkueelle ja sarjalle (jos valittu)
      let gamesUrl = `/api/games?team_id=${selectedTeam}`;
      if (selectedCompetition) {
        gamesUrl += `&series_id=${selectedCompetition}`;
      }
      if (startDate) {
        gamesUrl += `&start_date=${encodeURIComponent(startDate)}`;
      }
      if (endDate) {
        gamesUrl += `&end_date=${encodeURIComponent(endDate)}`;
      }
      const gamesRes = await fetch(gamesUrl);
      const gamesData = await gamesRes.json();

        // Pelaajien pelatut pelit, voitot, tasapelit, tappiot, maalit, syötöt, pisteet, pistettä/peli, blokit, blokit/peli, vedot kohti maalia, vedot maaliakohti/peli, vedot blokkiin, vedot blokkiin/peli, vedot ohi maalin ja vedot ohi maalin/peli
        playerStats = {};
        playerList = [];
        if (Array.isArray(playersData.players)) {
          for (const p of playersData.players) {
            playerStats[p.id] = { id: p.id, name: `${p.first_name} ${p.last_name}`, games: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, points: 0, pointsPerGame: "0.00", blocks: 0, blocksPerGame: "0.00", shotsOnGoal: 0, shotsOnGoalPerGame: "0.00", shotsBlocked: 0, shotsBlockedPerGame: "0.00", shotsOffTarget: 0, shotsOffTargetPerGame: "0.00" };
            playerList.push({ id: p.id, name: `${p.first_name} ${p.last_name}` });
          }
        }
        if (Array.isArray(gamesData.games)) {
          for (const game of gamesData.games) {
            if (Array.isArray(game.field_positions)) {
              for (const pid of game.field_positions) {
                if (playerStats[pid]) {
                  playerStats[pid].games += 1;
                  // Voittojen, tasapelien ja tappioiden laskenta
                  const teamGoalsArr = Array.isArray(game.team_goals) ? game.team_goals : [];
                  const opponentGoals = Array.isArray(game.opponent_goals) ? game.opponent_goals.length : 0;
                  const teamGoals = teamGoalsArr.length;
                  if (teamGoals > opponentGoals) {
                    playerStats[pid].wins += 1;
                  } else if (teamGoals === opponentGoals) {
                    playerStats[pid].draws += 1;
                  } else if (teamGoals < opponentGoals) {
                    playerStats[pid].losses += 1;
                  }
                  // Maalien laskenta
                  const goals = teamGoalsArr.filter((gid: string) => parseInt(gid) === pid).length;
                  playerStats[pid].goals += goals;
                  // Syöttöjen laskenta
                  const assistsArr = Array.isArray(game.assists) ? game.assists : [];
                  const assists = assistsArr.filter((aid: string) => parseInt(aid) === pid).length;
                  playerStats[pid].assists += assists;
                  // Pisteet
                  playerStats[pid].points += goals + assists;
                  // Blokkien laskenta
                  const blocksArr = Array.isArray(game.blocks) ? game.blocks : [];
                  playerStats[pid].blocks += blocksArr.filter((bid: string) => parseInt(bid) === pid).length;
                  // Vedot kohti maalia
                  const shotsOnGoalArr = Array.isArray(game.shots_on_goal) ? game.shots_on_goal : [];
                  playerStats[pid].shotsOnGoal += shotsOnGoalArr.filter((sid: string) => parseInt(sid) === pid).length;
                  // Vedot blokkiin
                  const shotsBlockedArr = Array.isArray(game.shots_blocked) ? game.shots_blocked : [];
                  playerStats[pid].shotsBlocked += shotsBlockedArr.filter((sbid: string) => parseInt(sbid) === pid).length;
                  // Vedot ohi maalin
                  const shotsOffTargetArr = Array.isArray(game.shots_off_target) ? game.shots_off_target : [];
                  playerStats[pid].shotsOffTarget += shotsOffTargetArr.filter((otid: string) => parseInt(otid) === pid).length;
                }
              }
            }
          }
          // Laske pistettä/peli, blokit/peli, vedot maaliakohti/peli, vedot blokkiin/peli ja vedot ohi maalin/peli kaikille
          for (const pid in playerStats) {
            const stats = playerStats[pid];
            stats.pointsPerGame = stats.games > 0 ? (stats.points / stats.games).toFixed(2) : "0.00";
            stats.blocksPerGame = stats.games > 0 ? (stats.blocks / stats.games).toFixed(2) : "0.00";
            stats.shotsOnGoalPerGame = stats.games > 0 ? (stats.shotsOnGoal / stats.games).toFixed(2) : "0.00";
            stats.shotsBlockedPerGame = stats.games > 0 ? (stats.shotsBlocked / stats.games).toFixed(2) : "0.00";
            stats.shotsOffTargetPerGame = stats.games > 0 ? (stats.shotsOffTarget / stats.games).toFixed(2) : "0.00";
          }
        }
      // Rakennetaan id->nimi map maalivahdeille
      const goalieIdMap: Record<number, string> = {};
      if (Array.isArray(goaliesData.players)) {
        for (const g of goaliesData.players) {
          goalieIdMap[g.id] = `${g.first_name} ${g.last_name}`;
        }
      }
      // Laske pelit
      goalieStats = {};
      if (Array.isArray(gamesData.games)) {
        for (const game of gamesData.games) {
          let goalieIds: number[] = [];
          if (Array.isArray(game.field_positions)) {
            goalieIds = goalieIds.concat(game.field_positions.filter((id: number) => goalieIdMap[id]));
          }
          if (game.goalie_change && goalieIdMap[game.goalie_change]) {
            goalieIds.push(game.goalie_change);
          }
          const uniqueGoalies = Array.from(new Set(goalieIds));
          const teamGoals = Array.isArray(game.team_goals) ? game.team_goals.length : 0;
          const opponentGoals = Array.isArray(game.opponent_goals) ? game.opponent_goals.length : 0;
          const isWin = teamGoals > opponentGoals;
          const isDraw = teamGoals === opponentGoals;
          const isLoss = teamGoals < opponentGoals;
          for (const gid of uniqueGoalies) {
            const name = goalieIdMap[gid];
            if (!goalieStats[name]) {
              goalieStats[name] = { name, games: 0, wins: 0, draws: 0, losses: 0, assists: 0, saves: 0, opponentGoals: 0, interruptions: 0 };
            }
            goalieStats[name].games += 1;
            if (isWin) goalieStats[name].wins += 1;
            if (isDraw) goalieStats[name].draws += 1;
            if (isLoss) goalieStats[name].losses += 1;
            // Laske syötöt
            if (Array.isArray(game.assists)) {
              goalieStats[name].assists += game.assists.filter((aid: number) => aid === gid).length;
            }
            // Laske torjunnat
            if (Array.isArray(game.saves)) {
              goalieStats[name].saves += game.saves.filter((sid: number) => sid === gid).length;
            }
            // Laske päästetyt maalit
            if (Array.isArray(game.opponent_goals)) {
              goalieStats[name].opponentGoals += game.opponent_goals.filter((oid: string) => String(gid) === oid).length;
            }
            // Laske katkot
            if (Array.isArray(game.goalie_game_interruption)) {
              goalieStats[name].interruptions += game.goalie_game_interruption.filter((iid: number) => iid === gid).length;
            }
          }
        }
        // Laske torjunta-%, päästetyt/peli ja katkot/peli kaikille maalivahdeille
        for (const name in goalieStats) {
          const saves = Number(goalieStats[name].saves) || 0;
          const opponentGoals = Number(goalieStats[name].opponentGoals) || 0;
          const interruptions = Number(goalieStats[name].interruptions) || 0;
          const games = Number(goalieStats[name].games) || 0;
          const totalShots = saves + opponentGoals;
          goalieStats[name].savePct = totalShots > 0 ? ((saves / totalShots) * 100).toFixed(1) : '0.0';
          goalieStats[name].goalsPerGame = games > 0 ? (opponentGoals / games).toFixed(2) : '0.00';
          goalieStats[name].interruptionsPerGame = games > 0 ? (interruptions / games).toFixed(2) : '0.00';
        }
      }
      // Laske plus-pisteet
      for (const pid in playerStats) {
        let plusCount = 0;
        for (const game of gamesData.games) {
          if (Array.isArray(game.plus_points)) {
            plusCount += game.plus_points.filter(id => id === Number(pid)).length;
          }
        }
        playerStats[pid].plus = plusCount;
      }
      // Laske miinus-pisteet
      for (const pid in playerStats) {
        let minusCount = 0;
        for (const game of gamesData.games) {
          if (Array.isArray(game.minus_points)) {
            minusCount += game.minus_points.filter(id => id === Number(pid)).length;
          }
        }
        playerStats[pid].minus = minusCount;
      }
      // Järjestä playerList sukunimen mukaan aakkosjärjestykseen
      playerList.sort((a, b) => {
        const aLast = a.name.split(' ').pop()?.toLowerCase() ?? '';
        const bLast = b.name.split(' ').pop()?.toLowerCase() ?? '';
        return aLast.localeCompare(bLast);
      });
    }
  import { onMount } from 'svelte';
  let teams: any[] = [];
  let competitions: any[] = [];
  let selectedTeam: number | null = null;
  let selectedCompetition: number | null = null;
  let startDate: string = '';
  let endDate: string = '';

  onMount(async () => {
    // Hae joukkueet
    const teamsRes = await fetch('/api/admin/teams');
    const teamsData = await teamsRes.json();
    if (Array.isArray(teamsData)) {
      teams = teamsData;
    } else if (Array.isArray(teamsData.teams)) {
      teams = teamsData.teams;
    } else {
      teams = [];
    }
    // Hae sarjat
    const compRes = await fetch('/api/competitions');
    const compData = await compRes.json();
    competitions = Array.isArray(compData.series) ? compData.series : [];
  });
</script>

<main class="stats-main">
  <h1>Tilastot</h1>
    <div class="stats-filters">
    <div class="filter-row">
      <label for="team-select">Valitse joukkue:</label>
      <select id="team-select" bind:value={selectedTeam}>
        <option value="">-- Valitse --</option>
        {#each teams as team}
          <option value={team.id}>{team.name}</option>
        {/each}
      </select>
    </div>
    <div class="filter-row">
      <label for="competition-select">Valitse sarja:</label>
      <select id="competition-select" bind:value={selectedCompetition}>
        <option value="">-- Valitse --</option>
        {#each competitions as comp}
          <option value={comp.id}>{comp.name}</option>
        {/each}
      </select>
    </div> 
    <div class="filter-row">
      <label for="start-date">Alkaen:</label>
      <input type="date" id="start-date" bind:value={startDate} />
      <label for="end-date" style="margin-left:16px;">Päättyen:</label>
      <input type="date" id="end-date" bind:value={endDate} />
    </div>
    <div class="filter-row">
      <button class="btn-fetch" on:click={fetchStats}>Hae tilastot</button>
    </div>
    <div class="stats-headings">
      <h2>Maalivahtitilastot</h2>
      <table class="player-table">
        <thead>
          <tr>
            <th class="name-col">Nimi</th>
            <th>Pelit</th>
            <th>Voitot</th>
            <th>Tasapelit</th>
            <th>Tappiot</th>
              <th>Syötöt</th>
            <th>Torjunnat</th>
            <th>Päästetyt</th>
            <th>Torjunta-%</th>
            <th>Päästettyjä <br/>maaleja/peli</th>
            <th>Katkot</th>
            <th>Katkot/peli</th>
          </tr>
        </thead>
        <tbody>
            {#each goalieNames as name}
              <tr>
                <td class="name-col">{name}</td>
                <td>{goalieStats[name]?.games ?? 0}</td>
                <td>{goalieStats[name]?.wins ?? 0}</td>
                <td>{goalieStats[name]?.draws ?? 0}</td>
                <td>{goalieStats[name]?.losses ?? 0}</td>
                <td>{goalieStats[name]?.assists ?? 0}</td>
                <td>{goalieStats[name]?.saves ?? 0}</td>
                <td>{goalieStats[name]?.opponentGoals ?? 0}</td>
                <td>{goalieStats[name]?.savePct ?? '0.0'}%</td>
                <td>{goalieStats[name]?.goalsPerGame ?? '0.00'}</td>
                <td>{goalieStats[name]?.interruptions ?? 0}</td>
                <td>{goalieStats[name]?.interruptionsPerGame ?? '0.00'}</td>
              </tr>
            {/each}
        </tbody>
      </table>
      <h2>Pelaajatilastot</h2>
          <table class="player-table">
            <thead>
              <tr>
                <th class="name-col">Nimi</th>
                <th>Pelit</th>
                <th>Voitot</th>
                <th>Tasapelit</th>
                <th>Tappiot</th>
                <th>Maalit</th>
                <th>Syötöt</th>
                <th>Pisteet</th>
                <th>Pistettä/peli</th>
                <th>+</th>
                <th>-</th>
                <th>+/-</th>
                <th>Blokit</th>
                <th>Blokit/peli</th>
                <th>Vedot <br/>maalia kohti</th>
                <th>Vedot <br/>maalia kohti/peli</th>
                <th>Vedot <br/>blokkiin</th>
                <th>Vedot <br/>blokkiin/peli</th>
                <th>Vedot <br/>ohi maalin</th>
                <th>Vedot <br/>ohi maalin/peli</th>                
              </tr>
            </thead>
            <tbody>
              {#each playerList as player}
                <tr>
                  <td class="name-col">{player.name}</td>
                  <td>{playerStats[player.id]?.games ?? 0}</td>
                  <td>{playerStats[player.id]?.wins ?? 0}</td>
                  <td>{playerStats[player.id]?.draws ?? 0}</td>
                  <td>{playerStats[player.id]?.losses ?? 0}</td>
                  <td>{playerStats[player.id]?.goals ?? 0}</td>
                  <td>{playerStats[player.id]?.assists ?? 0}</td>
                  <td>{playerStats[player.id]?.points ?? 0}</td>
                  <td>{playerStats[player.id]?.pointsPerGame ?? "0.00"}</td>
                  <td>{playerStats[player.id]?.plus ?? ''}</td>
                  <td>{playerStats[player.id]?.minus ?? ''}</td>
                  <td>{(playerStats[player.id]?.plus ?? 0) - (playerStats[player.id]?.minus ?? 0)}</td>
                  <td>{playerStats[player.id]?.blocks ?? 0}</td>
                  <td>{playerStats[player.id]?.blocksPerGame ?? "0.00"}</td>
                  <td>{playerStats[player.id]?.shotsOnGoal ?? 0}</td>
                  <td>{playerStats[player.id]?.shotsOnGoalPerGame ?? "0.00"}</td>
                  <td>{playerStats[player.id]?.shotsBlocked ?? 0}</td>
                  <td>{playerStats[player.id]?.shotsBlockedPerGame ?? "0.00"}</td>
                  <td>{playerStats[player.id]?.shotsOffTarget ?? 0}</td>
                  <td>{playerStats[player.id]?.shotsOffTargetPerGame ?? "0.00"}</td>                  
                </tr>
              {/each}
            </tbody>
          </table>
    </div>
  </div>
</main>

<style>
main.stats-main .player-table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0 32px 0;
  font-size: 1.05rem;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
main.stats-main .player-table th,
main.stats-main .player-table td {
  border: 1px solid #b5c6d6;
  padding: 12px 10px;
  text-align: center;
}
main.stats-main .player-table td.name-col,
main.stats-main .player-table th.name-col {
  text-align: left;
  width: max-content;
  white-space: nowrap;
  padding-right: 0;
}
main.stats-main .player-table th {
  background: #e3f0fa;
  font-weight: 600;
  font-size: 1.1rem;
}
main.stats-main .player-table tbody tr {
  transition: background 0.2s;
}
main.stats-main .player-table tbody tr:nth-child(even) td {
  background: #f6f6f6;
}
main.stats-main .player-table tbody tr:hover {
  background: #f5faff;
}
main.stats-main {
  padding-left: 32px;
}
main.stats-main h1 {
  font-size: 2rem;
  color: #1a1a1a;
  margin-bottom: 24px;
}
main.stats-main .stats-filters {
  margin-bottom: 32px;
  text-align: left;
}
main.stats-main .filter-row {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
}
main.stats-main label {
  min-width: 120px;
  font-weight: 500;
}
main.stats-main select,
main.stats-main input[type="date"] {
  padding: 6px 10px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  margin-left: 8px;
}
main.stats-main .btn-fetch {
  padding: 10px 32px;
  background: #2196f3;
  color: #fff;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}
</style>
