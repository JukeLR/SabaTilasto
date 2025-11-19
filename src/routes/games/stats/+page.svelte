<script lang="ts">
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
    teams = Array.isArray(teamsData) ? teamsData : teamsData.teams || [];
    // Hae sarjat
    const compRes = await fetch('/api/competitions');
    const compData = await compRes.json();
    competitions = Array.isArray(compData) ? compData : compData.competitions || [];
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
    <div class="filter-row" style="justify-content: flex-end;">
      <button class="btn-fetch">Hae tilastot</button>
    </div>
    <div class="stats-headings">
      <h2>Maalivahtitilastot</h2>
      <table class="goalie-table">
        <thead>
          <tr>
            <th>Nimi</th>
            <th>Pelit</th>
            <th>Voitot</th>
            <th>Tasapelit</th>
            <th>Tappiot</th>
            <th>Syötöt</th>
            <th>Torjunnat</th>
            <th>Päästetyt</th>
            <th>Torjunta-%</th>
            <th>Päästettyjä maaleja/pelit</th>
            <th>Katkot</th>
            <th>Katkot/peli</th>
          </tr>
        </thead>
        <tbody>
          <!-- Täytä datalla jatkossa -->
        </tbody>
      </table>
      <h2>Pelaajatilastot</h2>
    </div>
  </div>
</main>

<style>
.goalie-table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0 32px 0;
  font-size: 1.05rem;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
.goalie-table th, .goalie-table td {
  border: 1px solid #b5c6d6;
  padding: 12px 10px;
  text-align: center;
}
.goalie-table th {
  background: #e3f0fa;
  font-weight: 600;
  font-size: 1.1rem;
}
.goalie-table tbody tr {
  transition: background 0.2s;
}
.goalie-table tbody tr:hover {
  background: #f5faff;
}
h1 {
  font-size: 2rem;
  color: #1a1a1a;
  margin-bottom: 24px;
}
.stats-filters {
  margin-bottom: 32px;
  text-align: left;
}
.stats-headings {
}
h1 {
  font-size: 2rem;
  color: #1a1a1a;
  margin-bottom: 24px;
}
.stats-filters {
  margin: 0 auto 32px auto;
  text-align: left;
  max-width: 400px;
}
.filter-row {
  margin-bottom: 18px;
  display: flex;
  align-items: center;
}
label {
  min-width: 120px;
  font-weight: 500;
}
select, input[type="date"] {
  padding: 6px 10px;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #ccc;
  margin-left: 8px;
}
  .btn-fetch {
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
