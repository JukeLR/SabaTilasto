<script lang="ts">
import { assists, fetchAssists } from '$lib/stores/assists';
import { plusPoints, minusPoints } from '$lib/stores/plusMinusPoints';
import { onMount } from 'svelte';
import { teamsStore, fetchTeams } from '$lib/stores/teams';
import { gameLineup, gameFieldPositions } from '$lib/stores/gameState';
import { playerNames, fetchAndUpdatePlayerNames } from '$lib/stores/playerNames';
import { teamGoals } from '$lib/stores/teamGoals';
import { opponentGoals } from '$lib/stores/opponentGoals';
import { shotsOnGoal } from '$lib/stores/shotsOnGoal';
import { shotsOffTarget } from '$lib/stores/shotsOffTarget';
import { shotsBlocked } from '$lib/stores/shotsBlocked';
import { blocks } from '$lib/stores/blocks';
import { saves, goalieGameInterruption, opponentShotOff } from '$lib/stores/saves';
import { goto } from '$app/navigation';
import { tick } from 'svelte';
import { globalLoading } from '$lib/stores/globalLoading';
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
	let userRole = $state('');
	let userTeamId: number | null = null;
	// Käytetään globaalia overlay-storea

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
			// Jos kirjuri tai vastuuvalmentaja, näytetään vain oman joukkueen pelit
			if ((userRole === 'kirjuri' || userRole === 'vastuuvalmentaja') && userTeamId) {
				url += `?team_id=${userTeamId}`;
			}
			const response = await fetch(url);
			const data = await response.json();
			if (response.ok) {
				let allGames = data.games || [];
				// Extra safety: filter on frontend too
				if ((userRole === 'kirjuri' || userRole === 'vastuuvalmentaja') && userTeamId) {
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

	async function viewGame(gameId: number, status: string) {
		globalLoading.set('Siirrytään...');
		await tick();
		if (typeof window !== 'undefined') void document.body.offsetHeight;
		if (status === 'Luotu') {
			if (typeof window !== 'undefined') {
				setTimeout(() => goto(`/games/new?edit=${gameId}`), 300);
			}
		} else {
			if (typeof window !== 'undefined') {
				setTimeout(() => goto(`/reports/${gameId}/tilasto`), 300);
			}
		}
	}

	async function startGame(gameId: number, mode: 'mobile' | 'desktop' = 'mobile') {
		globalLoading.set('Ladataan peliä...');
		await tick();
		if (typeof window !== 'undefined') void document.body.offsetHeight;
		let navigated = false;
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

			// Hae pelin tiedot ja tallenna storeihin
			const res = await fetch(`/api/games/${gameId}?basic=true`);
			const data = await res.json();
			// Tallennus storeihin
			if (Array.isArray(data.lineup) && data.lineup.length > 0) gameLineup.set(data.lineup);
			if (Array.isArray(data.fieldPositions) && data.fieldPositions.length > 0) gameFieldPositions.set(data.fieldPositions);
			if (Array.isArray(data.lineup) && data.lineup.length > 0) await fetchAndUpdatePlayerNames(data.lineup);
			if (Array.isArray(data.team_goals) && data.team_goals.length > 0) teamGoals.set(data.team_goals);
			if (Array.isArray(data.opponent_goals) && data.opponent_goals.length > 0) opponentGoals.set(data.opponent_goals);
			if (Array.isArray(data.shots_on_goal) && data.shots_on_goal.length > 0) shotsOnGoal.set(data.shots_on_goal);
			if (Array.isArray(data.shots_off_target) && data.shots_off_target.length > 0) shotsOffTarget.set(data.shots_off_target);
			if (Array.isArray(data.shots_blocked) && data.shots_blocked.length > 0) shotsBlocked.set(data.shots_blocked);
			if (Array.isArray(data.blocks) && data.blocks.length > 0) blocks.set(data.blocks);
			if (Array.isArray(data.saves) && data.saves.length > 0) saves.set(data.saves);
			if (Array.isArray(data.goalie_game_interruption) && data.goalie_game_interruption.length > 0) goalieGameInterruption.set(data.goalie_game_interruption);
			if (typeof data.opponent_shots_off === 'number') opponentShotOff.set(data.opponent_shots_off);
			if (Array.isArray(data.assists) && data.assists.length > 0) assists.set(data.assists);
			// Tallennus storeihin
			console.log('API plus_points:', data.plus_points);
			console.log('API minus_points:', data.minus_points);
			if (Array.isArray(data.plus_points) && data.plus_points.length > 0) plusPoints.set(data.plus_points);
			if (Array.isArray(data.minus_points) && data.minus_points.length > 0) minusPoints.set(data.minus_points);

			// Ohjaa tilastointisivulle
			if (typeof window !== 'undefined') {
				await tick();
				navigated = true;
				if (mode === 'desktop') {
					setTimeout(() => goto(`/games/${gameId}/desktop-stats`), 300);
				} else {
					setTimeout(() => goto(`/games/${gameId}/stats`), 300);
				}
			}
		} catch (err) {
			console.error('Error starting game:', err);
			// Ohjaa silti tilastointisivulle vaikka status-päivitys epäonnistuisi
			if (typeof window !== 'undefined') {
				await tick();
				navigated = true;
				if (mode === 'desktop') {
					setTimeout(() => goto(`/games/${gameId}/desktop-stats`), 300);
				} else {
					setTimeout(() => goto(`/games/${gameId}/stats`), 300);
				}
			}
		} finally {
			if (!navigated) {
				globalLoading.set(null);
			}
		}
	}
</script>

<svelte:head>
	<title>Pelit - SabaTilasto</title>
</svelte:head>

{#if $globalLoading}
	<div class="modal-loading">Ladataan...</div>
{/if}
<div class="games-container">

	<div style="display: flex; justify-content: space-between; align-items: center;">
		<h1>Pelit</h1>
		{#if userRole === 'admin'}
			<nav class="admin-menu">
				<a href="/admin/teams" class="admin-menu-link">Joukkueet</a>
			</nav>
		{/if}
	</div>
	<button class="btn-create" style="margin-bottom: 24px;" on:click={async () => { globalLoading.set('Siirrytään...'); await tick(); setTimeout(() => goto('/games/new'), 300); }}>
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
										<button class="btn-view" on:click={() => viewGame(game.id, game.status)}>
											Muokkaa
										</button>
										<button class="btn-start" on:click={() => startGame(game.id, 'mobile')}>
											   Aloita<br/>mobiilitilastointi
										   </button>
										<button class="btn-desktop" on:click={() => startGame(game.id, 'desktop')}>
											   Aloita<br/>työpöytätilastointi
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
										<button class="btn-view" on:click={() => viewGame(game.id, game.status)}>
											Näytä raportti
										</button>
										<button class="btn-continue" on:click={() => startGame(game.id)}>
											Mobiilitilastointi
										</button>
										<button class="btn-desktop" on:click={async () => { globalLoading.set('Siirrytään...'); await tick(); setTimeout(() => goto(`/games/${game.id}/desktop-stats`), 300); }}>
											Työpöytätilastointi
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
										<button class="btn-view" on:click={() => viewGame(game.id, game.status)}>
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
	.admin-menu {
		display: flex;
		gap: 18px;
		align-items: center;
	}
	.admin-menu-link {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 600;
		font-size: 1.05rem;
		padding: 6px 12px;
		border-radius: 6px;
		transition: background 0.2s;
	}
	.admin-menu-link:hover {
		background: #eaf4ff;
		text-decoration: underline;
	}
	.loading-overlay {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0,0,0,0.25);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	}
	.loading-modal {
		background: #fff;
		padding: 32px 48px;
		border-radius: 16px;
		box-shadow: 0 4px 24px rgba(0,0,0,0.18);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
		font-size: 1.2rem;
		font-weight: 600;
	}
	.loading-spinner {
		width: 36px;
		height: 36px;
		border: 4px solid #e0e0e0;
		border-top: 4px solid #5b9bd5;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 8px;
	}
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	.modal-loading {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0,0,0,0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		font-size: 2rem;
		color: #fff;
		font-weight: bold;
		letter-spacing: 1px;
		backdrop-filter: blur(2px);
	}
</style>


