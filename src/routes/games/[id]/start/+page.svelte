<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let { data } = $props();
	
	let game = $state<any>(null);
	let loading = $state(true);
	let error = $state('');
	
	onMount(async () => {
		await loadGame();
	});
	
	async function loadGame() {
		try {
			const response = await fetch(`/api/games/${data.gameId}?basic=true`);
			if (!response.ok) {
				throw new Error('Pelin lataaminen epäonnistui');
			}
			game = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe ladattaessa peliä';
		} finally {
			loading = false;
		}
	}
	
	async function startGame() {
		try {
			// Päivitä pelin status käynnissä-tilaan
			const response = await fetch(`/api/games/${data.gameId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'Käynnissä' })
			});

			if (!response.ok) {
				throw new Error('Pelin statuksen päivitys epäonnistui');
			}

			// Ohjaa tilastointisivulle
			goto(`/?game=${data.gameId}`);
		} catch (err) {
			console.error('Error starting game:', err);
			// Ohjaa silti tilastointisivulle vaikka status-päivitys epäonnistuisi
			goto(`/?game=${data.gameId}`);
		}
	}
</script>

<div class="container">
	{#if loading}
		<div class="loading">Ladataan peliä...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if game}
		<div class="game-created">
			<div class="success-icon">✓</div>
			<h1>Peli luotu onnistuneesti!</h1>
			
			<div class="game-info">
				<div class="info-row">
					<span class="label">Oma joukkue:</span>
					<span class="value">{game.ownTeamName || 'Ei tiedossa'}</span>
				</div>
				<div class="info-row">
					<span class="label">Vastustaja:</span>
					<span class="value">{game.opponentName}</span>
				</div>
				{#if game.gameLocation}
					<div class="info-row">
						<span class="label">Pelipaikka:</span>
						<span class="value">{game.gameLocation}</span>
					</div>
				{/if}
				<div class="info-row">
					<span class="label">Kokoonpano:</span>
					<span class="value">{game.lineup?.length || 0} pelaajaa</span>
				</div>
				<div class="info-row">
					<span class="label">Kentälliset:</span>
					<span class="value">{game.fieldPositions?.filter((id: any) => id !== null).length || 0} pelaajaa</span>
				</div>
			</div>
			
			<div class="actions">
				<button class="start-button" onclick={startGame}>
					Aloita tilastointi
				</button>
				<button class="back-button" onclick={() => goto('/games/new')}>
					Takaisin
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 40px 20px;
		padding-top: 100px;
	}
	
	.loading, .error {
		text-align: center;
		padding: 40px;
		font-size: 1.2rem;
	}
	
	.error {
		color: #dc3545;
	}
	
	.game-created {
		background: white;
		border-radius: 12px;
		padding: 40px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		text-align: center;
	}
	
	.success-icon {
		width: 80px;
		height: 80px;
		background-color: #28a745;
		color: white;
		font-size: 3rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 30px;
	}
	
	h1 {
		color: #333;
		margin: 0 0 30px;
		font-size: 1.8rem;
	}
	
	.game-info {
		background-color: #f8f9fa;
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 30px;
		text-align: left;
	}
	
	.info-row {
		display: flex;
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid #dee2e6;
	}
	
	.info-row:last-child {
		border-bottom: none;
	}
	
	.label {
		font-weight: 600;
		color: #666;
	}
	
	.value {
		color: #333;
	}
	
	.actions {
		display: flex;
		gap: 15px;
		justify-content: center;
		flex-wrap: wrap;
	}
	
	.start-button {
		padding: 15px 40px;
		background-color: #28a745;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.start-button:hover {
		background-color: #218838;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	
	.back-button {
		padding: 15px 40px;
		background-color: #6c757d;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.back-button:hover {
		background-color: #5a6268;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	
	@media (max-width: 768px) {
		.container {
			padding: 20px 15px;
			padding-top: 80px;
		}
		
		.game-created {
			padding: 30px 20px;
		}
		
		h1 {
			font-size: 1.5rem;
		}
		
		.actions {
			flex-direction: column;
		}
		
		.start-button,
		.back-button {
			width: 100%;
		}
	}
</style>
