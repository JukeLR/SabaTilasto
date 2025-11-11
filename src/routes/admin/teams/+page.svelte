<script lang="ts">
	import { onMount } from 'svelte';
	import { navigating } from '$app/stores';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let teams = $state<any[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let successMessage = $state('');
	
	// Lomakkeen tiedot
	let newTeamName = $state('');
	let newTeamCity = $state('');
	let newTeamAgeGroup = $state('');
	let isAdding = $state(false);
	
	// Muokkaus
	let editingTeamId = $state<number | null>(null);
	let editTeamName = $state('');
	let editTeamCity = $state('');
	let editTeamAgeGroup = $state('');

	onMount(() => {
		loadTeams();
	});

	async function loadTeams() {
		isLoading = true;
		error = '';
		
		try {
			const response = await fetch('/api/admin/teams');
			
			if (!response.ok) {
				throw new Error('Joukkueiden lataus epäonnistui');
			}
			
			const data = await response.json();
			teams = data.teams || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe ladattaessa joukkueita';
		} finally {
			isLoading = false;
		}
	}

	async function addTeam() {
		if (!newTeamName.trim()) {
			error = 'Joukkueen nimi on pakollinen';
			return;
		}

		isAdding = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/teams', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newTeamName,
					home_city: newTeamCity || null,
					age_group: newTeamAgeGroup || null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Joukkueen lisääminen epäonnistui');
			}

			successMessage = 'Joukkue lisätty onnistuneesti!';
			newTeamName = '';
			newTeamCity = '';
			newTeamAgeGroup = '';
			
			await loadTeams();
			
			setTimeout(() => successMessage = '', 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe lisättäessä joukkuetta';
		} finally {
			isAdding = false;
		}
	}

	function startEdit(team: any) {
		editingTeamId = team.id;
		editTeamName = team.name;
		editTeamCity = team.home_city || '';
		editTeamAgeGroup = team.age_group || '';
	}

	function cancelEdit() {
		editingTeamId = null;
		editTeamName = '';
		editTeamCity = '';
		editTeamAgeGroup = '';
	}

	async function saveEdit(teamId: number) {
		if (!editTeamName.trim()) {
			error = 'Joukkueen nimi on pakollinen';
			return;
		}

		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/teams', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: teamId,
					name: editTeamName,
					home_city: editTeamCity || null,
					age_group: editTeamAgeGroup || null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Joukkueen päivittäminen epäonnistui');
			}

			successMessage = 'Joukkue päivitetty onnistuneesti!';
			cancelEdit();
			await loadTeams();
			
			setTimeout(() => successMessage = '', 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe päivitettäessä joukkuetta';
		}
	}

	async function deleteTeam(teamId: number, teamName: string) {
		if (!confirm(`Haluatko varmasti poistaa joukkueen "${teamName}"?`)) {
			return;
		}

		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/teams', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: teamId })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Joukkueen poistaminen epäonnistui');
			}

			successMessage = 'Joukkue poistettu onnistuneesti!';
			await loadTeams();
			
			setTimeout(() => successMessage = '', 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe poistettaessa joukkuetta';
		}
	}

	function goBack() {
		window.history.back();
	}
</script>

<div class="admin-container">
	<div class="header">
		<button class="back-button" onclick={goBack}>← Takaisin</button>
		<h1>Joukkueiden hallinta</h1>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if successMessage}
		<div class="success-message">{successMessage}</div>
	{/if}

	<!-- Lisää uusi joukkue -->
	<div class="add-team-section">
		<h2>Lisää uusi joukkue</h2>
		<form onsubmit={(e) => { e.preventDefault(); addTeam(); }}>
			<div class="form-row">
				<div class="form-group">
					<label for="team-name">Joukkueen nimi *</label>
					<input
						type="text"
						id="team-name"
						bind:value={newTeamName}
						placeholder="Esim. Kärpät"
						required
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="team-city">Kotikaupunki</label>
					<input
						type="text"
						id="team-city"
						bind:value={newTeamCity}
						placeholder="Esim. Oulu"
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="team-age">Ikäluokka</label>
					<input
						type="text"
						id="team-age"
						bind:value={newTeamAgeGroup}
						placeholder="Esim. U15, U17, Miehet"
						disabled={isAdding}
					/>
				</div>
			</div>

			<button type="submit" class="btn-add" disabled={isAdding}>
				{isAdding ? 'Lisätään...' : 'Lisää joukkue'}
			</button>
		</form>
	</div>

	<!-- Joukkueiden lista -->
	<div class="teams-section">
		<h2>Joukkueet ({teams.length})</h2>

		{#if isLoading}
			<p class="loading">Ladataan joukkueita...</p>
		{:else if teams.length === 0}
			<p class="no-teams">Ei joukkueita. Lisää ensimmäinen joukkue yllä olevalla lomakkeella.</p>
		{:else}
			<div class="teams-table">
				<table>
					<thead>
						<tr>
							<th>Nimi</th>
							<th>Kotikaupunki</th>
							<th>Ikäluokka</th>
							<th>Luotu</th>
							<th>Toiminnot</th>
						</tr>
					</thead>
					<tbody>
						{#each teams as team}
							<tr>
								{#if editingTeamId === team.id}
									<!-- Muokkaustila -->
									<td>
										<input
											type="text"
											bind:value={editTeamName}
											class="edit-input"
										/>
									</td>
									<td>
										<input
											type="text"
											bind:value={editTeamCity}
											class="edit-input"
										/>
									</td>
									<td>
										<input
											type="text"
											bind:value={editTeamAgeGroup}
											class="edit-input"
										/>
									</td>
									<td>{new Date(team.created_at).toLocaleDateString('fi-FI')}</td>
									<td>
										<button class="btn-save" onclick={() => saveEdit(team.id)}>Tallenna</button>
										<button class="btn-cancel" onclick={cancelEdit}>Peruuta</button>
									</td>
								{:else}
									<!-- Normaali näkymä -->
									<td><strong>{team.name}</strong></td>
									<td>{team.home_city || '-'}</td>
									<td>{team.age_group || '-'}</td>
									<td>{new Date(team.created_at).toLocaleDateString('fi-FI')}</td>
									<td>
										<button class="btn-edit" onclick={() => startEdit(team)}>Muokkaa</button>
										<button class="btn-delete" onclick={() => deleteTeam(team.id, team.name)}>Poista</button>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.admin-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 30px;
	}

	.back-button {
		background-color: #6c757d;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 10px 20px;
		cursor: pointer;
		font-size: 1rem;
	}

	.back-button:hover {
		background-color: #5a6268;
	}

	h1 {
		margin: 0;
		color: #1a1a1a;
	}

	h2 {
		color: #4a90e2;
		margin-bottom: 20px;
	}

	.error-message {
		background-color: #f8d7da;
		color: #721c24;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
	}

	.success-message {
		background-color: #d4edda;
		color: #155724;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
	}

	.add-team-section {
		background-color: #f8f9fa;
		padding: 25px;
		border-radius: 8px;
		margin-bottom: 30px;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 15px;
		margin-bottom: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		margin-bottom: 5px;
		font-weight: 600;
		color: #333;
	}

	.form-group input {
		padding: 10px;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		font-size: 1rem;
	}

	.form-group input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.btn-add {
		background-color: #28a745;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 12px 30px;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
	}

	.btn-add:hover {
		background-color: #218838;
	}

	.btn-add:disabled {
		background-color: #6c757d;
		cursor: not-allowed;
	}

	.teams-section {
		background-color: white;
		padding: 25px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.loading, .no-teams {
		text-align: center;
		color: #6c757d;
		padding: 20px;
	}

	.teams-table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background-color: #f8f9fa;
	}

	th, td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #dee2e6;
	}

	th {
		font-weight: 600;
		color: #495057;
	}

	tbody tr:hover {
		background-color: #f8f9fa;
	}

	.edit-input {
		padding: 5px;
		border: 1px solid #4a90e2;
		border-radius: 4px;
		width: 100%;
	}

	.btn-edit, .btn-delete, .btn-save, .btn-cancel {
		padding: 6px 12px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		margin-right: 5px;
	}

	.btn-edit {
		background-color: #4a90e2;
		color: white;
	}

	.btn-edit:hover {
		background-color: #357abd;
	}

	.btn-delete {
		background-color: #dc3545;
		color: white;
	}

	.btn-delete:hover {
		background-color: #c82333;
	}

	.btn-save {
		background-color: #28a745;
		color: white;
	}

	.btn-save:hover {
		background-color: #218838;
	}

	.btn-cancel {
		background-color: #6c757d;
		color: white;
	}

	.btn-cancel:hover {
		background-color: #5a6268;
	}

	@media (max-width: 768px) {
		.form-row {
			grid-template-columns: 1fr;
		}

		table {
			font-size: 0.9rem;
		}

		th, td {
			padding: 8px;
		}
	}
</style>
