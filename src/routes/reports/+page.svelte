<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  interface Game {
    id: number;
    own_team_id: number;
    opponent_team_name: string;
    game_location: string;
    game_date: string;
    status: 'Luotu' | 'Käynnissä' | 'Pelattu';
    lineup: number[];
    field_positions: number[];
    notes: string;
  }

  let games: Game[] = [];
  let isLoading = true;
  let error = '';

  let ongoingGames: Game[] = [];
  let completedGames: Game[] = [];

  onMount(async () => {
    await fetchGames();
  });

  async function fetchGames() {
    try {
      isLoading = true;
      error = '';
      const response = await fetch('/api/games');
      const data = await response.json();
      if (response.ok) {
        games = data.games || [];
        ongoingGames = games.filter(game => game.status === 'Käynnissä');
        completedGames = games.filter(game => game.status === 'Pelattu');
      } else {
        error = data.error || 'Pelien haku epäonnistui';
      }
    } catch (err) {
      error = 'Yhteysvirhe. Yritä uudelleen.';
    } finally {
      isLoading = false;
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fi-FI', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function viewGame(gameId: number) {
    goto(`/reports/${gameId}/tilasto`);
  }

  function showReport(gameId: number) {
    goto(`/reports/${gameId}/tilasto`);
  }
</script>

<div class="container">
  <h1>Raportit</h1>

  {#if isLoading}
    <div class="loading">Ladataan pelejä...</div>
  {:else if error}
    <div class="error-message">{error}</div>
  {:else}
    <section class="games-section">
      <h2>Käynnissä olevat pelit</h2>
      {#if ongoingGames.length === 0}
        <p class="no-games">Ei käynnissä olevia pelejä</p>
      {:else}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Päivämäärä</th>
                <th>Vastustaja</th>
                <th>Pelipaikka</th>
                <th>Toiminnot</th>
              </tr>
            </thead>
            <tbody>
              {#each ongoingGames as game}
                <tr>
                  <td>{formatDate(game.game_date)}</td>
                  <td>{game.opponent_team_name}</td>
                  <td>{game.game_location || '-'}</td>
                  <td class="actions">
                    <button class="btn-view" on:click={() => viewGame(game.id)}>
                      Tarkastele
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <section class="games-section">
      <h2>Pelatut pelit</h2>
      {#if completedGames.length === 0}
        <p class="no-games">Ei pelattuja pelejä</p>
      {:else}
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Päivämäärä</th>
                <th>Vastustaja</th>
                <th>Pelipaikka</th>
                <th>Toiminnot</th>
              </tr>
            </thead>
            <tbody>
              {#each completedGames as game}
                <tr>
                  <td>{formatDate(game.game_date)}</td>
                  <td>{game.opponent_team_name}</td>
                  <td>{game.game_location || '-'}</td>
                  <td class="actions">
                    <button class="btn-report" on:click={() => showReport(game.id)}>
                      Näytä raportti
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
  }
  h1 {
    color: #1a1a1a;
    font-size: 2rem;
    margin-bottom: 30px;
  }
  .games-section {
    margin-bottom: 40px;
  }
  .table-container {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid #ddd;
    text-align: left;
  }
  th {
    background: #f5f5f5;
    font-weight: 600;
  }
  .actions button {
    margin-right: 8px;
    padding: 6px 16px;
    border-radius: 8px;
    border: none;
    background: #5b9bd5;
    color: #fff;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  .actions button:last-child {
    margin-right: 0;
  }
  .btn-view {
    background: #4caf50;
  }
  .btn-report {
    background: #fbc02d;
    color: #222;
  }
  .no-games {
    color: #888;
    font-style: italic;
    margin: 10px 0 20px 0;
  }
  .loading {
    color: #555;
    font-size: 1.1rem;
    margin: 20px 0;
  }
  .error-message {
    color: #c00;
    font-weight: bold;
    margin: 20px 0;
  }
</style>
