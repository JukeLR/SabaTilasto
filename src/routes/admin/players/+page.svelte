<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let players = $state<any[]>([]);
	let teams = $state<any[]>([]);
	let selectedTeamId = $state('');
	let isLoading = $state(true);
	let error = $state('');
	let successMessage = $state('');

	// Lomakkeen tiedot
	let newFirstName = $state('');
	let newLastName = $state('');
	let newNick = $state('');
	let newJerseyNumber = $state('');
	let newPosition = $state('');
	let newTeamIds = $state<number[]>([]);
	let isAdding = $state(false);

	// Muokkaus
	let editingPlayerId = $state<number | null>(null);
	let editFirstName = $state('');
	let editLastName = $state('');
	let editNick = $state('');
	let editJerseyNumber = $state('');
	let editPosition = $state('');
	let editTeamIds = $state<number[]>([]);

	// Joukkueiden valinta modaali
	let showTeamModal = $state(false);
	let modalPlayerId = $state<number | null>(null);
	let modalTeamIds = $state<number[]>([]);

	onMount(() => {
		loadTeams();
		loadPlayers();
	});

	async function loadTeams() {
		try {
			const response = await fetch('/api/admin/teams');
			const data = await response.json();
			if (response.ok) {
				teams = data.teams || [];
			}
		} catch (err) {
			console.error('Virhe joukkueiden latauksessa:', err);
		}
	}

	async function loadPlayers() {
		isLoading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/players');

			if (!response.ok) {
				throw new Error('Pelaajien lataus epäonnistui');
			}

			const data = await response.json();
			players = data.players || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe ladattaessa pelaajia';
		} finally {
			isLoading = false;
		}
	}

	async function addPlayer() {
		if (!newFirstName.trim() || !newLastName.trim()) {
			error = 'Etunimi ja sukunimi ovat pakollisia';
			return;
		}

		isAdding = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: newFirstName,
					lastName: newLastName,
					nick: newNick,
					jerseyNumber: newJerseyNumber ? parseInt(newJerseyNumber) : null,
					position: newPosition || null,
					teamIds: newTeamIds
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Pelaajan lisääminen epäonnistui');
			}

			successMessage = 'Pelaaja lisätty onnistuneesti!';
			newFirstName = '';
			newLastName = '';
			newNick = '';
			newJerseyNumber = '';
			newPosition = '';
			newTeamIds = [];

			await loadPlayers();

			setTimeout(() => (successMessage = ''), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe lisättäessä pelaajaa';
		} finally {
			isAdding = false;
		}
	}

	function startEdit(player: any) {
		editingPlayerId = player.id;
		editFirstName = player.first_name;
		editLastName = player.last_name;
		editNick = player.nick || '';
		editJerseyNumber = player.jersey_number?.toString() || '';
		editPosition = player.position || '';
		editTeamIds = player.team_ids || [];
	}

	function cancelEdit() {
		editingPlayerId = null;
		editFirstName = '';
		editLastName = '';
		editNick = '';
		editJerseyNumber = '';
		editPosition = '';
		editTeamIds = [];
	}

	async function saveEdit(playerId: number) {
		if (!editFirstName.trim() || !editLastName.trim()) {
			error = 'Etunimi ja sukunimi ovat pakollisia';
			return;
		}

		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/players', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: playerId,
					firstName: editFirstName,
					lastName: editLastName,
					nick: editNick,
					jerseyNumber: editJerseyNumber ? parseInt(editJerseyNumber) : null,
					position: editPosition || null,
					teamIds: editTeamIds
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Pelaajan päivittäminen epäonnistui');
			}

			successMessage = 'Pelaaja päivitetty onnistuneesti!';
			cancelEdit();
			await loadPlayers();

			setTimeout(() => (successMessage = ''), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe päivitettäessä pelaajaa';
		}
	}

	async function deletePlayer(playerId: number, playerName: string) {
		if (!confirm(`Haluatko varmasti poistaa pelaajan "${playerName}"?`)) {
			return;
		}

		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/admin/players', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: playerId })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Pelaajan poistaminen epäonnistui');
			}

			successMessage = 'Pelaaja poistettu onnistuneesti!';
			await loadPlayers();

			setTimeout(() => (successMessage = ''), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe poistettaessa pelaajaa';
		}
	}

	function toggleTeam(teamId: number, isEditing: boolean = false) {
		const targetArray = isEditing ? modalTeamIds : newTeamIds;
		
		if (targetArray.includes(teamId)) {
			if (isEditing) {
				modalTeamIds = modalTeamIds.filter((id) => id !== teamId);
			} else {
				newTeamIds = newTeamIds.filter((id) => id !== teamId);
			}
		} else {
			if (isEditing) {
				modalTeamIds = [...modalTeamIds, teamId];
			} else {
				newTeamIds = [...newTeamIds, teamId];
			}
		}
	}

	function openTeamModal(player: any) {
		modalPlayerId = player.id;
		modalTeamIds = player.team_ids || [];
		showTeamModal = true;
	}

	function closeTeamModal() {
		showTeamModal = false;
		modalPlayerId = null;
		modalTeamIds = [];
	}

	async function saveTeamSelection() {
		if (!modalPlayerId) return;

		error = '';
		successMessage = '';

		try {
			const player = players.find(p => p.id === modalPlayerId);
			if (!player) return;

			const response = await fetch('/api/admin/players', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: modalPlayerId,
					firstName: player.first_name,
					lastName: player.last_name,
					nick: player.nick,
					jerseyNumber: player.jersey_number,
					position: player.position,
					teamIds: modalTeamIds
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Joukkueiden päivittäminen epäonnistui');
			}

			successMessage = 'Joukkueet päivitetty onnistuneesti!';
			closeTeamModal();
			await loadPlayers();

			setTimeout(() => (successMessage = ''), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe päivitettäessä joukkueita';
		}
	}
</script>

<div class="admin-container">
	<div class="header">
		<h1>Pelaajien hallinta</h1>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if successMessage}
		<div class="success-message">{successMessage}</div>
	{/if}

	<!-- Lisää uusi pelaaja -->
	<div class="add-player-section">
		<h2>Lisää uusi pelaaja</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				addPlayer();
			}}
		>
			<div class="form-row">
				<div class="form-group">
					<label for="first-name">Etunimi *</label>
					<input
						type="text"
						id="first-name"
						bind:value={newFirstName}
						placeholder="Esim. Matti"
						required
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="last-name">Sukunimi *</label>
					<input
						type="text"
						id="last-name"
						bind:value={newLastName}
						placeholder="Esim. Meikäläinen"
						required
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="nick">Lempinimi</label>
					<input
						type="text"
						id="nick"
						bind:value={newNick}
						placeholder="Esim. Masa"
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="jersey-number">Pelinumero</label>
					<input
						type="number"
						id="jersey-number"
						bind:value={newJerseyNumber}
						placeholder="Esim. 9"
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="position">Pelipaikka</label>
					<select id="position" bind:value={newPosition} disabled={isAdding}>
						<option value="">Valitse...</option>
						<option value="Hyökkääjä">Hyökkääjä</option>
						<option value="Puolustaja">Puolustaja</option>
						<option value="Maalivahti">Maalivahti</option>
					</select>
				</div>
			</div>

			<div class="form-group">
				<label>Joukkueet</label>
				<div class="team-checkboxes">
					{#each teams as team}
						<label class="checkbox-label">
							<input
								type="checkbox"
								checked={newTeamIds.includes(team.id)}
								onchange={() => toggleTeam(team.id, false)}
								disabled={isAdding}
							/>
							<span class="team-info">
								<strong>{team.name}</strong>
								{#if team.age_group || team.home_city}
									<span class="team-details">
										{team.age_group || ''}{team.age_group && team.home_city ? ', ' : ''}{team.home_city || ''}
									</span>
								{/if}
							</span>
						</label>
					{/each}
				</div>
			</div>

			<button type="submit" class="btn-add" disabled={isAdding}>
				{isAdding ? 'Lisätään...' : 'Lisää pelaaja'}
			</button>
		</form>
	</div>

	<!-- Pelaajien lista -->
	<div class="players-section">
		<h2>Pelaajat ({players.length})</h2>
		<div style="margin-bottom: 18px;">
			<label for="team-filter" style="margin-right:8px; font-weight:500;">Suodata joukkue:</label>
			<select id="team-filter" bind:value={selectedTeamId} style="padding:6px 12px; border-radius:6px; font-size:1rem;">
				<option value="">Kaikki joukkueet</option>
				{#each teams as team}
					<option value={team.id}>{team.name}</option>
				{/each}
			</select>
		</div>
		{#if isLoading}
			<p class="loading">Ladataan pelaajia...</p>
		{:else if players.length === 0}
			<p class="no-players">Ei pelaajia. Lisää ensimmäinen pelaaja yllä olevalla lomakkeella.</p>
		{:else}
			<div class="players-table">
				<table>
					<thead>
						<tr>
							<th>Nimi</th>
							<th>Lempinimi</th>
							<th>Pelinumero</th>
							<th>Pelipaikka</th>
							<th>Joukkueet</th>
							<th>Toiminnot</th>
						</tr>
					</thead>
					<tbody>
						{#each players.filter(p => !selectedTeamId || (p.team_ids && p.team_ids.includes(Number(selectedTeamId)))) as player}
							<tr>
								{#if editingPlayerId === player.id}
									<!-- Muokkaustila -->
									<td>
										<input type="text" bind:value={editFirstName} class="edit-input" placeholder="Etunimi" />
										<input type="text" bind:value={editLastName} class="edit-input" placeholder="Sukunimi" />
									</td>
									<td>
										<input type="text" bind:value={editNick} class="edit-input" placeholder="Lempinimi" />
									</td>
									<td>
										<input type="number" bind:value={editJerseyNumber} class="edit-input" placeholder="Numero" />
									</td>
									<td>
										<select bind:value={editPosition} class="edit-input">
											<option value="">-</option>
											<option value="Hyökkääjä">Hyökkääjä</option>
											<option value="Puolustaja">Puolustaja</option>
											<option value="Maalivahti">Maalivahti</option>
										</select>
									</td>
									<td>
										{#if player.teams && player.teams.length > 0}
											{player.teams.map((t: any) => t.name).join(', ')}
										{:else}
											<span class="no-teams-text">Ei joukkueita</span>
										{/if}
									</td>
									<td>
										<button class="btn-save" onclick={() => saveEdit(player.id)}>Tallenna</button>
										<button class="btn-cancel" onclick={cancelEdit}>Peruuta</button>
									</td>
								{:else}
									<!-- Normaali näkymä -->
									<td><strong>{player.first_name} {player.last_name}</strong></td>
									<td>{player.nick || '-'}</td>
									<td>{player.jersey_number || '-'}</td>
									<td>{player.position || '-'}</td>
									<td>
										{#if player.teams && player.teams.length > 0}
											{player.teams.map((t: any) => t.name).join(', ')}
										{:else}
											<span class="no-teams-text">Ei joukkueita</span>
										{/if}
										<button class="btn-small" onclick={() => openTeamModal(player)}>Muokkaa</button>
									</td>
									<td>
										<button class="btn-edit" onclick={() => startEdit(player)}>Muokkaa</button>
										<button
											class="btn-delete"
											onclick={() => deletePlayer(player.id, `${player.first_name} ${player.last_name}`)}
											>Poista</button
										>
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

<!-- Joukkueiden valinta modaali -->
{#if showTeamModal}
	<div class="modal-overlay" onclick={closeTeamModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h2>Valitse joukkueet</h2>
			<div class="modal-team-list">
				{#each teams as team}
					<label class="modal-team-item">
						<input
							type="checkbox"
							checked={modalTeamIds.includes(team.id)}
							onchange={() => toggleTeam(team.id, true)}
						/>
						<span class="team-info">
							<strong>{team.name}</strong>
							{#if team.age_group || team.home_city}
								<span class="team-details">
									{team.age_group || ''}{team.age_group && team.home_city ? ', ' : ''}{team.home_city || ''}
								</span>
							{/if}
						</span>
					</label>
				{/each}
			</div>
			<div class="modal-buttons">
				<button class="btn-save" onclick={saveTeamSelection}>Tallenna</button>
				<button class="btn-cancel" onclick={closeTeamModal}>Peruuta</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.admin-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.header {
		margin-bottom: 30px;
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

	.add-player-section {
		background-color: #f8f9fa;
		padding: 25px;
		border-radius: 8px;
		margin-bottom: 30px;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

	.form-group input,
	.form-group select {
		padding: 10px;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		font-size: 1rem;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.team-checkboxes {
		display: flex;
		flex-wrap: wrap;
		gap: 15px;
		padding: 10px;
		background-color: white;
		border-radius: 6px;
		border: 1px solid #dee2e6;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 5px;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		cursor: pointer;
	}

	.team-info {
		display: flex;
		flex-direction: column;
	}

	.team-details {
		font-size: 0.85rem;
		color: #6c757d;
	}

	.team-checkboxes-inline {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.checkbox-label-small {
		display: flex;
		align-items: center;
		gap: 3px;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.team-info-small {
		display: flex;
		flex-direction: column;
	}

	.team-details-small {
		font-size: 0.8rem;
		color: #6c757d;
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

	.players-section {
		background-color: white;
		padding: 25px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.loading,
	.no-players {
		text-align: center;
		color: #6c757d;
		padding: 20px;
	}

	.players-table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background-color: #f8f9fa;
	}

	th,
	td {
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
		margin-bottom: 5px;
	}

	.no-teams-text {
		color: #6c757d;
		font-style: italic;
	}

	.btn-edit,
	.btn-delete,
	.btn-save,
	.btn-cancel {
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

	.btn-small {
		padding: 4px 8px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		background-color: #6c757d;
		color: white;
		margin-left: 8px;
	}

	.btn-small:hover {
		background-color: #5a6268;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 2000;
		padding: 20px;
	}

	.modal-content {
		background-color: white;
		border-radius: 8px;
		padding: 30px;
		max-width: 500px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.modal-content h2 {
		margin-top: 0;
		margin-bottom: 20px;
		color: #1a1a1a;
	}

	.modal-team-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 20px;
		max-height: 400px;
		overflow-y: auto;
		padding: 10px;
		background-color: #f8f9fa;
		border-radius: 6px;
	}

	.modal-team-item {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px;
		background-color: white;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.modal-team-item:hover {
		background-color: #e9ecef;
	}

	.modal-team-item input[type='checkbox'] {
		margin-top: 2px;
		cursor: pointer;
	}

	.modal-buttons {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	@media (max-width: 768px) {
		.form-row {
			grid-template-columns: 1fr;
		}

		table {
			font-size: 0.9rem;
		}

		th,
		td {
			padding: 8px;
		}
	}
</style>
