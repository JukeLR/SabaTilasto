
<script lang="ts">
import { onMount } from 'svelte';
import { teamsStore, fetchTeams } from '$lib/stores/teams';
import { goto } from '$app/navigation';
import { page } from '$app/stores';

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

	let games = $state<Game[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let user = null;
	let userRole = '';
	let userTeamId: number | null = null;

	// Jaa pelit tilan mukaan
	let createdGames = $derived(games.filter(game => game.status === 'Luotu'));
	let ongoingGames = $derived(games.filter(game => game.status === 'Käynnissä'));
	let completedGames = $derived(games.filter(game => game.status === 'Pelattu'));



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
		await fetchGames();
		await fetchTeams();
	});

	async function fetchGames() {
		try {
			isLoading = true;
			error = '';
			let url = '/api/games';
			// If kirjuri, only fetch their own team's games
			if (userRole === 'kirjuri' && userTeamId) {
				url += `?team_id=${userTeamId}`;
			}
			const response = await fetch(url);
			const data = await response.json();
			if (response.ok) {
				let allGames = data.games || [];
				// Extra safety: filter on frontend too
				if (userRole === 'kirjuri' && userTeamId) {
					allGames = allGames.filter((g: Game) => g.own_team_id === userTeamId);
				}
				games = allGames;
			} else {
				error = data.error || 'Pelien haku epäonnistui';
			}
		} catch (err) {
			console.error('Error fetching games:', err);
			error = 'Yhteysvirhe. Yritä uudelleen.';
		} finally {
			isLoading = false;
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return '-';
		const date = new Date(dateString);
		return date.toLocaleDateString('fi-FI', { 
			day: '2-digit', 
			month: '2-digit', 
			year: 'numeric' 
		});
	}

	function viewGame(gameId: number, status: string) {
		// Luotu-tilan pelit avataan muokkaukseen
		if (status === 'Luotu') {
			if (typeof window !== 'undefined') {
				goto(`/games/new?edit=${gameId}`);
			}
		} else {
			// Käynnissä ja Pelattu pelit avataan raporttinäkymässä
			if (typeof window !== 'undefined') {
				goto(`/reports/${gameId}/tilasto`);
			}
		}
	}

	async function startGame(gameId: number) {
		try {
			// Päivitä pelin status käynnissä-tilaan
			const response = await fetch(`/api/games/${gameId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'Käynnissä' })
			});

			if (response.ok) {
				// Päivitä lista
				await fetchGames();
			}

			// Ohjaa tilastointisivulle
			if (typeof window !== 'undefined') {
				goto(`/games/${gameId}/stats`);
			}
		} catch (err) {
			console.error('Error starting game:', err);
			// Ohjaa silti tilastointisivulle vaikka status-päivitys epäonnistuisi
			if (typeof window !== 'undefined') {
				goto(`/games/${gameId}/stats`);
			}
		}
	}
</script>

<svelte:head>
	<title>Pelit - SabaTilasto</title>
</svelte:head>

<div class="games-container">
	<h1>Pelit</h1>
	<button class="btn-create" style="margin-bottom: 24px;" onclick={() => goto('/games/new')}>
		Luo Peli
	</button>

	{#if isLoading}
		<div class="loading">Ladataan pelejä...</div>
	{:else if error}
		<div class="error-message">{error}</div>
	{:else}
		<!-- Luotu -->
		<section class="games-section">
			<h2>Luotu</h2>
			
			{#if createdGames.length === 0}
				<p class="no-games">Ei luotuja pelejä</p>
			{:else}
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Päivämäärä</th>
								<th>Oma joukkue</th>
								<th>Vastustaja</th>
								<th>Pelipaikka</th>
								<th>Toiminnot</th>
							</tr>
						</thead>
						<tbody>
							{#each createdGames as game}
								<tr>
									<td>{formatDate(game.game_date)}</td>
									<td>{$teamsStore[game.own_team_id] || game.own_team_id}</td>
									<td>{game.opponent_team_name}</td>
									<td>{game.game_location || '-'}</td>
									<td class="actions">
										<button class="btn-view" onclick={() => viewGame(game.id, game.status)}>
											Muokkaa
										</button>
										<button class="btn-start" onclick={() => startGame(game.id)}>
											Aloita tilastointi
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Käynnissä -->
		<section class="games-section">
			<h2>Käynnissä</h2>
			
			{#if ongoingGames.length === 0}
				<p class="no-games">Ei käynnissä olevia pelejä</p>
			{:else}
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Päivämäärä</th>
								<th>Oma joukkue</th>
								<th>Vastustaja</th>
								<th>Pelipaikka</th>
								<th>Toiminnot</th>
							</tr>
						</thead>
						<tbody>
							{#each ongoingGames as game}
								<tr>
									<td>{formatDate(game.game_date)}</td>
									<td>{$teamsStore[game.own_team_id] || game.own_team_id}</td>
									<td>{game.opponent_team_name}</td>
									<td>{game.game_location || '-'}</td>
									<td class="actions">
										<button class="btn-view" onclick={() => viewGame(game.id, game.status)}>
											Näytä raportti
										</button>
										<button class="btn-continue" onclick={() => startGame(game.id)}>
											Jatka tilastointia
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Pelattu -->
		<section class="games-section">
			<h2>Pelattu</h2>
			
			{#if completedGames.length === 0}
				<p class="no-games">Ei pelattuja pelejä</p>
			{:else}
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Päivämäärä</th>
								<th>Oma joukkue</th>
								<th>Vastustaja</th>
								<th>Pelipaikka</th>
								<th>Toiminnot</th>
							</tr>
						</thead>
						<tbody>
							{#each completedGames as game}
								<tr>
									<td>{formatDate(game.game_date)}</td>
									<td>{$teamsStore[game.own_team_id] || game.own_team_id}</td>
									<td>{game.opponent_team_name}</td>
									<td>{game.game_location || '-'}</td>
									<td class="actions">
										<button class="btn-view" onclick={() => viewGame(game.id, game.status)}>
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
	.btn-create {
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
	.games-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 30px;
		color: #333;
	}

	.loading {
		text-align: center;
		padding: 40px;
		font-size: 1.1rem;
		color: #666;
	}

	.error-message {
		background-color: #fee;
		color: #c33;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 20px;
		text-align: center;
	}

	.games-section {
		margin-bottom: 50px;
	}

	.games-section h2 {
		font-size: 1.5rem;
		margin-bottom: 20px;
		color: #444;
		border-bottom: 2px solid #007bff;
		padding-bottom: 10px;
	}

	.no-games {
		text-align: center;
		padding: 30px;
		color: #666;
		font-style: italic;
	}

	.table-container {
		overflow-x: auto;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background-color: #f8f9fa;
	}

	th {
		padding: 15px;
		text-align: left;
		font-weight: 600;
		color: #333;
		border-bottom: 2px solid #dee2e6;
	}

	td {
		padding: 15px;
		border-bottom: 1px solid #dee2e6;
	}

	tbody tr:hover {
		background-color: #f8f9fa;
	}

	.actions {
		display: flex;
		gap: 10px;
	}

	button {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
	}

	.btn-view {
		background-color: #6c757d;
		color: white;
	}

	.btn-view:hover {
		background-color: #5a6268;
	}

	.btn-start {
		background-color: #28a745;
		color: white;
	}

	.btn-start:hover {
		background-color: #218838;
	}

	.btn-continue {
		background-color: #ffc107;
		color: #212529;
	}

	.btn-continue:hover {
		background-color: #e0a800;
	}

	/* Mobiilityyli */
	@media (max-width: 768px) {
		.games-container {
			padding: 15px;
		}

		h1 {
			font-size: 1.5rem;
			margin-bottom: 20px;
		}

		.games-section h2 {
			font-size: 1.2rem;
		}

		.table-container {
			border-radius: 6px;
		}

		table {
			font-size: 0.85rem;
		}

		th, td {
			padding: 10px 8px;
		}

		.actions {
			flex-direction: column;
			gap: 5px;
		}

		button {
			width: 100%;
			padding: 6px 12px;
			font-size: 0.85rem;
		}
	}

	@media (max-width: 480px) {
		/* Piilota sarakkeet pienillä näytöillä ja näytä tärkeimmät */
		table {
			font-size: 0.8rem;
		}

		th:nth-child(3),
		td:nth-child(3) {
			display: none;
		}
	}
</style>
