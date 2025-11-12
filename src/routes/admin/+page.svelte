<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let users = $state<any[]>([]);
	let teams = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let editingUserId = $state<number | null>(null);
	let selectedTeams = $state<number[]>([]);

	onMount(() => {
		loadTeams();
		loadUsers();
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

	async function loadUsers() {
		loading = true;
		try {
			const response = await fetch('/api/admin/users');
			const data = await response.json();

			if (response.ok) {
				users = data.users;
			} else {
				error = data.error || 'Käyttäjien lataus epäonnistui';
			}
		} catch (err) {
			error = 'Yhteysvirhe';
		} finally {
			loading = false;
		}
	}

	async function updateRole(userId: number, newRole: string) {
		try {
			const response = await fetch('/api/admin/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetUserId: userId, newRole })
			});

			if (response.ok) {
				await loadUsers();
				alert('Rooli päivitetty!');
			} else {
				const data = await response.json();
				alert(data.error || 'Päivitys epäonnistui');
			}
		} catch (err) {
			alert('Yhteysvirhe');
		}
	}

	function startEditTeams(user: any) {
		editingUserId = user.id;
		selectedTeams = user.teams?.map((t: any) => t.id) || [];
	}

	function toggleTeam(teamId: number) {
		if (selectedTeams.includes(teamId)) {
			selectedTeams = selectedTeams.filter(id => id !== teamId);
		} else {
			selectedTeams = [...selectedTeams, teamId];
		}
	}

	async function saveTeams(userId: number) {
		try {
			const response = await fetch('/api/admin/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetUserId: userId, teamIds: selectedTeams })
			});

			if (response.ok) {
				await loadUsers();
				editingUserId = null;
				selectedTeams = [];
				alert('Joukkueet päivitetty!');
			} else {
				const data = await response.json();
				alert(data.error || 'Päivitys epäonnistui');
			}
		} catch (err) {
			alert('Yhteysvirhe');
		}
	}

	function cancelEdit() {
		editingUserId = null;
		selectedTeams = [];
	}

	function getTeamNames(userTeams: any[]): string {
		if (!userTeams || userTeams.length === 0) return '-';
		return userTeams.map(t => t.name).join(', ');
	}
</script>

<div class="admin-container">
	<header>
		<h1>Käyttäjähallinta</h1>
		<a href="/" class="back-link">← Takaisin etusivulle</a>
	</header>

	{#if loading}
		<p>Ladataan käyttäjiä...</p>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<div class="users-table">
			<table>
				<thead>
					<tr>
						<th>Käyttäjätunnus</th>
						<th>Nimi</th>
						<th>Sähköposti</th>
						<th>Rooli</th>
						<th>Joukkueet</th>
						<th>Luotu</th>
					</tr>
				</thead>
				<tbody>
					{#each users as user}
						<tr>
							<td>{user.username}</td>
							<td>{user.first_name} {user.last_name}</td>
							<td>{user.email}</td>
							<td>
								<select 
									value={user.role} 
									onchange={(e) => updateRole(user.id, e.currentTarget.value)}
									class="role-select"
								>
									<option value="admin">Admin</option>
									<option value="junioripäällikkö">Junioripäällikkö</option>
									<option value="vastuuvalmentaja">Vastuuvalmentaja</option>
									<option value="toimihenkilö">Toimihenkilö</option>
									<option value="kirjuri">Kirjuri</option>
									<option value="pelaaja">Pelaaja</option>
								</select>
							</td>
							<td>
								{#if editingUserId === user.id}
									<div class="teams-edit">
										{#each teams as team}
											<label class="team-checkbox">
												<input
													type="checkbox"
													checked={selectedTeams.includes(team.id)}
													onchange={() => toggleTeam(team.id)}
												/>
												{team.name}
											</label>
										{/each}
										<div class="edit-buttons">
											<button class="btn-save-small" onclick={() => saveTeams(user.id)}>Tallenna</button>
											<button class="btn-cancel-small" onclick={cancelEdit}>Peruuta</button>
										</div>
									</div>
								{:else}
									<div class="teams-display">
										<span>{getTeamNames(user.teams)}</span>
										<button class="btn-edit-small" onclick={() => startEditTeams(user)}>Muokkaa</button>
									</div>
								{/if}
							</td>
							<td>{new Date(user.created_at).toLocaleDateString('fi-FI')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.admin-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 40px 20px;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30px;
	}

	h1 {
		font-size: 2rem;
		color: #1a1a1a;
	}

	.back-link {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 600;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.error {
		background-color: #fee;
		color: #c33;
		padding: 16px;
		border-radius: 8px;
		margin-bottom: 20px;
	}

	.users-table {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background-color: #f8f9fa;
	}

	th {
		text-align: left;
		padding: 16px;
		font-weight: 600;
		color: #495057;
		border-bottom: 2px solid #dee2e6;
	}

	td {
		padding: 16px;
		border-bottom: 1px solid #dee2e6;
	}

	tr:hover {
		background-color: #f8f9fa;
	}

	.role-select {
		padding: 6px 12px;
		border: 2px solid #dee2e6;
		border-radius: 6px;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.role-select:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.teams-display {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.teams-edit {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		background-color: #f8f9fa;
		border-radius: 6px;
	}

	.team-checkbox {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.team-checkbox input {
		cursor: pointer;
	}

	.edit-buttons {
		display: flex;
		gap: 5px;
		margin-top: 5px;
	}

	.btn-edit-small, .btn-save-small, .btn-cancel-small {
		padding: 4px 10px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}

	.btn-edit-small {
		background-color: #4a90e2;
		color: white;
	}

	.btn-edit-small:hover {
		background-color: #357abd;
	}

	.btn-save-small {
		background-color: #28a745;
		color: white;
	}

	.btn-save-small:hover {
		background-color: #218838;
	}

	.btn-cancel-small {
		background-color: #6c757d;
		color: white;
	}

	.btn-cancel-small:hover {
		background-color: #5a6268;
	}
</style>
