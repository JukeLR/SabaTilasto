<script lang="ts">
    let goalieNames: string[] = [];
    let playerNames: string[] = [];

    async function fetchStats() {
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
              <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
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
              {#each playerNames as name}
                <tr>
                  <td class="name-col">{name}</td>
                  <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
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
