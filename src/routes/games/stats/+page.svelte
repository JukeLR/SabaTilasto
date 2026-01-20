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
let usedGameIds: number[] = [];
let showGoalsHeatmap = false;
let showShotsOnGoalHeatmap = false;
let showBlocksHeatmap = false;
let showOffTargetHeatmap = false;
let shotmapPoints: Array<{ x: number; y: number; type: string }> = [];
let shotsOnGoalPoints: Array<{ x: number; y: number; type: string }> = [];
let blocksPoints: Array<{ x: number; y: number; type: string }> = [];
let offTargetPoints: Array<{ x: number; y: number; type: string }> = [];
let kenttaImgEl: HTMLImageElement | null = null;
let overlayWidth = 1200;
let overlayHeight = 800;

    async function fetchStats() {
        console.log('fetchStats kutsuttu, selectedTeam:', selectedTeam);
     
      if (!selectedTeam) {
        alert('Valitse joukkue ennen hakua!');
        return;
      }
      // Hae maalivahdit
      const goaliesRes = await fetch(`/api/players?team_id=${selectedTeam}&position=Maalivahti`);
      const goaliesData = await goaliesRes.json();
      let filteredGoalies = Array.isArray(goaliesData.players) ? goaliesData.players.slice() : [];
      // Pelaaja-roolilla näytetään vain sidotun pelaajan maalivahtitilastot
      if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
        const allowedIds = user.player_ids.map((id: any) => Number(id));
        filteredGoalies = filteredGoalies.filter((g: any) => allowedIds.includes(g.id));
      }
      goalieNames = filteredGoalies
        .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name))
        .map((p: any) => `${p.first_name} ${p.last_name}`);
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
      if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
        // Pelaaja-roolissa: vain pelit joissa pelaaja on mukana
        const allowedIds = user.player_ids.map((id: any) => Number(id));
        usedGameIds = Array.isArray(gamesData.games)
          ? gamesData.games.filter((g: any) => Array.isArray(g.field_positions) && g.field_positions.some((pid: number) => allowedIds.includes(pid))).map((g: any) => g.id)
          : [];
      } else {
        usedGameIds = Array.isArray(gamesData.games)
          ? gamesData.games.map((g: any) => g.id)
          : [];
      }
      

        // Pelaajien pelatut pelit, voitot, tasapelit, tappiot, maalit, syötöt, pisteet, pistettä/peli, blokit, blokit/peli, vedot kohti maalia, vedot maaliakohti/peli, vedot blokkiin, vedot blokkiin/peli, vedot ohi maalin ja vedot ohi maalin/peli
        playerStats = {};
        playerList = [];
        if (Array.isArray(playersData.players)) {
          for (const p of playersData.players) {
            playerStats[p.id] = { id: p.id, name: `${p.first_name} ${p.last_name}`, games: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, points: 0, pointsPerGame: "0.00", blocks: 0, blocksPerGame: "0.00", shotsOnGoal: 0, shotsOnGoalPerGame: "0.00", shotsBlocked: 0, shotsBlockedPerGame: "0.00", shotsOffTarget: 0, shotsOffTargetPerGame: "0.00" };
            playerList.push({ id: p.id, name: `${p.first_name} ${p.last_name}` });
          }
        }
        // Pelaaja-roolilla näytetään vain sidotun pelaajan tilastot
        if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
          const allowedIds = user.player_ids.map((id: any) => Number(id));
          playerList = playerList.filter(p => allowedIds.includes(p.id));
          const filteredStats: typeof playerStats = {};
          for (const id of allowedIds) {
            if (playerStats[id]) filteredStats[id] = playerStats[id];
          }
          playerStats = filteredStats;
        }
        if (Array.isArray(gamesData.games)) {
          console.log('Kaikki pelit:', gamesData.games);
          const seriesIds = [...new Set(gamesData.games.map((g: any) => g.series_id).filter(Boolean))];
          console.log('Joukkueen sarja-id:t:', seriesIds);
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
      for (const g of filteredGoalies) {
        goalieIdMap[g.id] = `${g.first_name} ${g.last_name}`;
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
          // Pelaaja-roolilla suodata vain sallitut maalivahdit
          let uniqueGoalies = Array.from(new Set(goalieIds));
          if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
            const allowedIds = user.player_ids.map((id: any) => Number(id));
            uniqueGoalies = uniqueGoalies.filter((gid) => allowedIds.includes(gid));
          }
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
            plusCount += game.plus_points.filter((id: number) => id === Number(pid)).length;
          }
        }
        playerStats[pid].plus = plusCount;
      }
      // Laske miinus-pisteet
      for (const pid in playerStats) {
        let minusCount = 0;
        for (const game of gamesData.games) {
          if (Array.isArray(game.minus_points)) {
            minusCount += game.minus_points.filter((id: number) => id === Number(pid)).length;
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
  import { page } from '$app/stores';
  // onMount already imported above, getContext not needed
  let teams: any[] = [];
  let competitions: any[] = [];
  let selectedTeam: number | null = null;
  let seriesPlayed: number[] = [];

  async function selectedTeamChanged() {
    if (selectedTeam) {
      const res = await fetch(`/api/games?team_id=${selectedTeam}`);
      const data = await res.json();
      if (Array.isArray(data.games)) {
        const seriesIds = [...new Set(data.games.map((g: any) => g.series_id).filter(Boolean))];
        seriesPlayed = seriesIds;
        console.log('Joukkueen sarja-id:t (valittu joukkue):', seriesIds);
      } else {
        seriesPlayed = [];
      }
    } else {
      seriesPlayed = [];
    }
  }
  let selectedCompetition: number | null = null;
  let startDate: string = '';
  let endDate: string = '';
  import type { User } from '$lib/db';
  let user: User | null = null;
  let userRole = '';
  let userTeamId: number | null = null;

  onMount(async () => {
    // Get user from layout data
    const data = page && page.subscribe ? (await new Promise<any>(res => {
      let unsub: (() => void) | undefined;
      unsub = page.subscribe(val => {
        if (unsub) unsub();
        res(val.data);
      });
    })) : {};
    user = data?.user || null;
    userRole = user?.role || '';
    userTeamId = user?.team_ids && Array.isArray(user.team_ids) && user.team_ids.length > 0 ? user.team_ids[0] : null;
    
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

    // Jos kirjuri, vastuuvalmentaja, toimihenkilö TAI pelaaja, näytä vain omat joukkueet
    if ((userRole === 'kirjuri' || userRole === 'vastuuvalmentaja' || userRole === 'toimihenkilö' || userRole === 'pelaaja') && user?.team_ids && Array.isArray(user.team_ids)) {
      const userTeamIdsNum = user.team_ids.map((id: any) => Number(id));
      teams = teams.filter((team: any) => userTeamIdsNum.includes(Number(team.id)));
      if (teams.length === 0) {
        console.warn('KÄYTTÄJÄ: Ei yhtään joukkuetta täsmää user.team_ids:', user.team_ids, 'teams:', teams);
      }
      // Jos käyttäjällä on vain yksi joukkue, valitse se automaattisesti
      if (teams.length === 1) {
        selectedTeam = teams[0].id;
        await selectedTeamChanged();
      }
    }

    // Hae sarjat
    const compRes = await fetch('/api/competitions');
    const compData = await compRes.json();
    competitions = Array.isArray(compData.series) ? compData.series : [];

    // Varmista overlayWidth/Height päivitys sivun latauksessa
    if (kenttaImgEl && kenttaImgEl.complete) {
      updateOverlaySize();
    } else if (kenttaImgEl) {
      kenttaImgEl.onload = updateOverlaySize;
    }
  });

  function toggleGoalsHeatmap() {
    showGoalsHeatmap = !showGoalsHeatmap;
    if (showGoalsHeatmap) {
      fetchGoalsHeatmap();
    } else {
      shotmapPoints = [];
    }
  }

  async function fetchGoalsHeatmap() {
    if (!usedGameIds || usedGameIds.length === 0) {
      shotmapPoints = [];
      console.log('fetchGoalsHeatmap: Ei käytettäviä pelejä');
      return;
    }
    try {
      const params = usedGameIds.map(id => `games_id=${id}`).join('&');
      console.log('fetchGoalsHeatmap: Haetaan /api/shotmap', params);
      const res = await fetch(`/api/shotmap?${params}`);
      const data = await res.json();
      console.log('fetchGoalsHeatmap: API data', data);
      if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
        // Näytä vain pelaajan omat pisteet
        const allowedIds = user.player_ids.map((id: any) => Number(id));
        shotmapPoints = Array.isArray(data)
          ? data.filter(pt => pt.type === 'M' && allowedIds.includes(Number(pt.player_id)))
          : [];
        console.log('fetchGoalsHeatmap: Pelaajan pisteet', shotmapPoints);
      } else {
        shotmapPoints = Array.isArray(data)
          ? data.filter(pt => pt.type === 'M')
          : [];
        console.log('fetchGoalsHeatmap: Kaikki pisteet', shotmapPoints);
      }
    } catch (e) {
      console.error('Heatmap fetch error', e);
      shotmapPoints = [];
    }
  }

  function toggleShotsOnGoalHeatmap() {
    showShotsOnGoalHeatmap = !showShotsOnGoalHeatmap;
    if (showShotsOnGoalHeatmap) {
      fetchShotsOnGoalHeatmap();
    } else {
      shotsOnGoalPoints = [];
    }
  }

    async function fetchShotsOnGoalHeatmap() {
      if (!usedGameIds || usedGameIds.length === 0) {
        shotsOnGoalPoints = [];
        console.log('fetchShotsOnGoalHeatmap: Ei käytettäviä pelejä');
        return;
      }
      try {
        const params = usedGameIds.map(id => `games_id=${id}`).join('&');
        console.log('fetchShotsOnGoalHeatmap: Haetaan /api/shotmap', params);
        const res = await fetch(`/api/shotmap?${params}`);
        const data = await res.json();
        console.log('fetchShotsOnGoalHeatmap: API data', data);
        if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
          const allowedIds = user.player_ids.map((id: any) => Number(id));
          shotsOnGoalPoints = Array.isArray(data)
            ? data.filter(pt => pt.type === 'K' && allowedIds.includes(Number(pt.player_id)))
            : [];
          console.log('fetchShotsOnGoalHeatmap: Pelaajan pisteet', shotsOnGoalPoints);
        } else {
          shotsOnGoalPoints = Array.isArray(data)
            ? data.filter(pt => pt.type === 'K')
            : [];
          console.log('fetchShotsOnGoalHeatmap: Kaikki pisteet', shotsOnGoalPoints);
        }
      } catch (e) {
        console.error('ShotsOnGoal heatmap fetch error', e);
        shotsOnGoalPoints = [];
      }
    }

  function toggleBlocksHeatmap() {
    showBlocksHeatmap = !showBlocksHeatmap;
    if (showBlocksHeatmap) {
      fetchBlocksHeatmap();
    } else {
      blocksPoints = [];
    }
  }

    async function fetchBlocksHeatmap() {
      if (!usedGameIds || usedGameIds.length === 0) {
        blocksPoints = [];
        console.log('fetchBlocksHeatmap: Ei käytettäviä pelejä');
        return;
      }
      try {
        const params = usedGameIds.map(id => `games_id=${id}`).join('&');
        console.log('fetchBlocksHeatmap: Haetaan /api/shotmap', params);
        const res = await fetch(`/api/shotmap?${params}`);
        const data = await res.json();
        console.log('fetchBlocksHeatmap: API data', data);
        if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
          const allowedIds = user.player_ids.map((id: any) => Number(id));
          blocksPoints = Array.isArray(data)
            ? data.filter(pt => pt.type === 'B' && allowedIds.includes(Number(pt.player_id)))
            : [];
          console.log('fetchBlocksHeatmap: Pelaajan pisteet', blocksPoints);
        } else {
          blocksPoints = Array.isArray(data)
            ? data.filter(pt => pt.type === 'B')
            : [];
          console.log('fetchBlocksHeatmap: Kaikki pisteet', blocksPoints);
        }
      } catch (e) {
        console.error('Blocks heatmap fetch error', e);
        blocksPoints = [];
      }
    }    
  
  function toggleOffTargetHeatmap() {
      showOffTargetHeatmap = !showOffTargetHeatmap;
      if (showOffTargetHeatmap) {
        fetchOffTargetHeatmap();
      } else {
        offTargetPoints = [];
      }
    }

    async function fetchOffTargetHeatmap() {
      if (!usedGameIds || usedGameIds.length === 0) {
        offTargetPoints = [];
        console.log('fetchOffTargetHeatmap: Ei käytettäviä pelejä');
        return;
      }
      try {
        const params = usedGameIds.map(id => `games_id=${id}`).join('&');
        console.log('fetchOffTargetHeatmap: Haetaan /api/shotmap', params);
        const res = await fetch(`/api/shotmap?${params}`);
        const data = await res.json();
        console.log('fetchOffTargetHeatmap: API data', data);
        if (userRole === 'pelaaja' && user && Array.isArray(user.player_ids) && user.player_ids.length > 0) {
          const allowedIds = user.player_ids.map((id: any) => Number(id));
          offTargetPoints = Array.isArray(data)
            ? data.filter(pt => pt.type === 'O' && allowedIds.includes(Number(pt.player_id)))
            : [];
          console.log('fetchOffTargetHeatmap: Pelaajan pisteet', offTargetPoints);
        } else {
          offTargetPoints = Array.isArray(data)
            ? data.filter(pt => pt.type === 'O')
            : [];
          console.log('fetchOffTargetHeatmap: Kaikki pisteet', offTargetPoints);
        }
      } catch (e) {
        console.error('OffTarget heatmap fetch error', e);
        offTargetPoints = [];
      }
    }  

  function updateOverlaySize() {
    if (kenttaImgEl) {
      overlayWidth = kenttaImgEl.naturalWidth || kenttaImgEl.width || 1200;
      overlayHeight = kenttaImgEl.naturalHeight || kenttaImgEl.height || 800;
    }
  }

$: if (shotmapPoints && shotmapPoints.length > 0) {
}

  function scaleX(x: number) {
    // Neonissa x: 0 (vasen) ... 1 (oikea)
    return x * overlayWidth;
  }
  function scaleY(y: number) {
    // Neonissa y: 0 (ALHAALLA) ... 1 (YLHÄÄLLÄ), SVG:ssä 0 (YLHÄÄLLÄ) ... overlayHeight (ALHAALLA)
    return overlayHeight - (y * overlayHeight);
  }
  
</script>

<main class="stats-main">
  <h1>Tilastot</h1>
    <div class="stats-filters">
    <div class="filter-row">
      <label for="team-select">Valitse joukkue:</label>
      <select id="team-select" bind:value={selectedTeam} on:change={selectedTeamChanged} disabled={userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0)}>
        <option value="">-- Valitse --</option>
        {#each teams as team}
          {#if userRole === 'kirjuri' || userRole === 'vastuuvalmentaja'}
            {#if user?.team_ids && user.team_ids.includes(team.id)}
              <option value={team.id}>{team.name}</option>
            {/if}
          {:else}
            {#if userRole !== 'toimihenkilö' || (user?.team_ids && user.team_ids.includes(team.id))}
              <option value={team.id}>{team.name}</option>
            {/if}
          {/if}
        {/each}
      </select>
    </div>
    <div class="filter-row">
      <label for="competition-select">Valitse sarja:</label>
      <select id="competition-select" bind:value={selectedCompetition} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))}>
        <option value="">-- Valitse --</option>
        {#each competitions.filter(comp => seriesPlayed.includes(comp.id)) as comp}
          <option value={comp.id}>{comp.name}</option>
        {/each}
      </select>
    </div> 
    <div class="filter-row">
      <label for="start-date">Alkaen:</label>
      <input type="date" id="start-date" bind:value={startDate} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))} />
      <label for="end-date" style="margin-left:16px;">Päättyen:</label>
      <input type="date" id="end-date" bind:value={endDate} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))} />
    </div>
    <div class="filter-row">
      <button class="btn-fetch" on:click={fetchStats} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))}>Hae tilastot</button>
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

  <!-- Kenttäkuva pelaajatilastojen alle -->
  <div style="width:100%; max-width:1200px; margin-top:40px;">
  <div style="display:flex; justify-content:space-between; align-items:center; width:100%; max-width:1200px; margin-bottom:10px;">
      <div style="font-size:1.3rem; font-weight:bold; color:#222;">{selectedTeam ? (teams.find(t => t.id == selectedTeam)?.name ?? 'Joukkue') : 'Joukkue'}</div>
      <div style="display:flex; gap:16px;">
        <button class="kentta-btn {showGoalsHeatmap ? 'active' : ''}" on:click={toggleGoalsHeatmap} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))}>Maalit</button>
        <button class="kentta-btn {showShotsOnGoalHeatmap ? 'active-yellow' : ''}" on:click={toggleShotsOnGoalHeatmap} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))}>Vedot kohti maalia</button>
        <button class="kentta-btn {showBlocksHeatmap ? 'active-green' : ''}" on:click={toggleBlocksHeatmap} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))}>Blokit</button>
        <button class="kentta-btn {showOffTargetHeatmap ? 'active-blue' : ''}" on:click={toggleOffTargetHeatmap} disabled={!selectedTeam || (userRole === 'pelaaja' && (!user?.player_ids || user.player_ids.length === 0))}>Vedot ohimaalin</button>
      </div>
      <div style="font-size:1.3rem; font-weight:bold; color:#222;">Vastustaja</div>
    </div>
    <div class="kentta-container-fit" style="position:relative; width:100%; max-width:1200px; margin:0;">
      <img src="/Kentta.svg" alt="Kenttä" class="kentta-img-fit" bind:this={kenttaImgEl} on:load={updateOverlaySize} style="width:100%; max-width:1200px; display:block; margin:0; padding:0; border:none;" />
      {#if showGoalsHeatmap}
        <svg class="kentta-overlay-fit" viewBox={`0 0 ${overlayWidth} ${overlayHeight}`} style="position:absolute; left:0; top:0; width:100%; height:100%; max-width:1200px; margin:0; padding:0; border:none; pointer-events:none; z-index:2;">
          {#each shotmapPoints as pt}
            {#if pt.type === 'M'}
                <circle cx={scaleX(pt.x)} cy={scaleY(pt.y)} r={overlayWidth/100} fill="rgba(255,0,0,0.35)" />
              {/if}
            {/each}
          </svg>
      {/if}
      {#if showShotsOnGoalHeatmap}
        <svg class="kentta-overlay-fit" viewBox={`0 0 ${overlayWidth} ${overlayHeight}`} style="position:absolute; left:0; top:0; width:100%; height:100%; max-width:1200px; margin:0; padding:0; border:none; pointer-events:none; z-index:2;">
          {#each shotsOnGoalPoints as pt}
            {#if pt.type === 'K'}
              <circle cx={scaleX(pt.x)} cy={scaleY(pt.y)} r={overlayWidth/100} fill="rgba(255,215,0,0.35)" />
            {/if}
          {/each}
        </svg>
      {/if}
      {#if showBlocksHeatmap}
        <svg class="kentta-overlay-fit" viewBox={`0 0 ${overlayWidth} ${overlayHeight}`} style="position:absolute; left:0; top:0; width:100%; height:100%; max-width:1200px; margin:0; padding:0; border:none; pointer-events:none; z-index:2;">
          {#each blocksPoints as pt}
            {#if pt.type === 'B'}
              <circle cx={scaleX(pt.x)} cy={scaleY(pt.y)} r={overlayWidth/100} fill="rgba(0,200,0,0.35)" />
            {/if}
          {/each}
        </svg>
      {/if}
      {#if showOffTargetHeatmap}
        <svg class="kentta-overlay-fit" viewBox={`0 0 ${overlayWidth} ${overlayHeight}`} style="position:absolute; left:0; top:0; width:100%; height:100%; max-width:1200px; margin:0; padding:0; border:none; pointer-events:none; z-index:2;">
          {#each offTargetPoints as pt}
            {#if pt.type === 'O'}
              <circle cx={scaleX(pt.x)} cy={scaleY(pt.y)} r={overlayWidth/100} fill="rgba(0,0,255,0.35)" />
            {/if}
          {/each}
        </svg>
      {/if}    
    </div>  
  </div>
</main>

<style>
.kentta-btn.active {
  background: #43ea43;
  color: #fff;
  border: 2px solid #219c21;
}
.kentta-btn.active-yellow {
  background: #ffe066;
  color: #222;
  border: 2px solid #bfa600;
}
.kentta-btn.active-green {
  background: #a0f3a0;
  color: #111;
  border: 2px solid ##a0f3a0;
}
.kentta-btn.active-blue {
      background: #61a2d8;
      color: #111;
      border: 2px solid #61a2d8;
    }
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
.kentta-btn {
  font-size: 1.05rem;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  border: 1px solid #b5c6d6;
  background: #e3f0fa;
  color: #222;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.kentta-btn.active {
  background: #ee8ba4;
  color: #111;
  border: 2px solid #ee8ba4;
}
.kentta-btn:hover {
  background: #b5c6d6;
  color: #111;
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
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    padding: 0;
    margin: 0;
    border: none;
    z-index: 2;
    max-width: 1200px;
  }
</style>
