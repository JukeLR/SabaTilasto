<script lang="ts">
	import { onMount } from 'svelte';

	interface Series {
		id: number;
		name: string;
		season: string | null;
		created_at: string;
	}

	let series = $state<Series[]>([]);
	let isLoading = $state(true);
	let error = $state('');
	let successMessage = $state('');
	
	// Uuden sarjan luominen
	let newSeriesName = $state('');
	let newSeriesSeason = $state('');
	let isAdding = $state(false);
	
	// Muokkaus
	let editingSeriesId = $state<number | null>(null);
	let editSeriesName = $state('');
	let editSeriesSeason = $state('');

	onMount(() => {
		loadSeries();
	});

	async function loadSeries() {
		isLoading = true;
		error = '';
		
		try {
			const response = await fetch('/api/competitions');
			
			if (!response.ok) {
				throw new Error('Sarjojen lataus epäonnistui');
			}
			
			const data = await response.json();
			series = data.series || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe ladattaessa sarjoja';
		} finally {
			isLoading = false;
		}
	}

	async function addSeries() {
		if (!newSeriesName.trim()) {
			error = 'Sarjan nimi on pakollinen';
			return;
		}

		isAdding = true;
		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/competitions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newSeriesName,
					season: newSeriesSeason || null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Sarjan lisääminen epäonnistui');
			}

			successMessage = 'Sarja lisätty onnistuneesti!';
			newSeriesName = '';
			newSeriesSeason = '';
			
			await loadSeries();
			
			setTimeout(() => successMessage = '', 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe lisättäessä sarjaa';
		} finally {
			isAdding = false;
		}
	}

	function startEdit(s: Series) {
		editingSeriesId = s.id;
		editSeriesName = s.name;
		editSeriesSeason = s.season || '';
	}

	function cancelEdit() {
		editingSeriesId = null;
		editSeriesName = '';
		editSeriesSeason = '';
	}

	async function saveEdit(seriesId: number) {
		if (!editSeriesName.trim()) {
			error = 'Sarjan nimi on pakollinen';
			return;
		}

		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/competitions', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: seriesId,
					name: editSeriesName,
					season: editSeriesSeason || null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Sarjan päivittäminen epäonnistui');
			}

			successMessage = 'Sarja päivitetty onnistuneesti!';
			cancelEdit();
			await loadSeries();
			
			setTimeout(() => successMessage = '', 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe päivitettäessä sarjaa';
		}
	}

	async function deleteSeries(seriesId: number, seriesName: string) {
		if (!confirm(`Haluatko varmasti poistaa sarjan "${seriesName}"?`)) {
			return;
		}

		error = '';
		successMessage = '';

		try {
			const response = await fetch('/api/competitions', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: seriesId })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Sarjan poistaminen epäonnistui');
			}

			successMessage = 'Sarja poistettu onnistuneesti!';
			await loadSeries();
			
			setTimeout(() => successMessage = '', 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe poistettaessa sarjaa';
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('fi-FI');
	}
</script>

<div class="admin-container">
	<div class="header">
		<h1>Sarjojen hallinta</h1>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if successMessage}
		<div class="success-message">{successMessage}</div>
	{/if}

	<!-- Lisää uusi sarja -->
	<div class="add-series-section">
		<h2>Lisää uusi sarja</h2>
		<form onsubmit={(e) => { e.preventDefault(); addSeries(); }}>
			<div class="form-row">
				<div class="form-group">
					<label for="series-name">Sarjan nimi *</label>
					<input
						type="text"
						id="series-name"
						bind:value={newSeriesName}
						placeholder="Esim. Miesten liiga"
						required
						disabled={isAdding}
					/>
				</div>

				<div class="form-group">
					<label for="series-season">Kausi</label>
					<input
						type="text"
						id="series-season"
						bind:value={newSeriesSeason}
						placeholder="Esim. 2024-2025 tai Kevät 2024"
						disabled={isAdding}
					/>
				</div>
			</div>

			<button type="submit" class="btn-add" disabled={isAdding}>
				{isAdding ? 'Lisätään...' : 'Lisää sarja'}
			</button>
		</form>
	</div>

	<!-- Sarjojen lista -->
	<div class="series-section">
		<h2>Sarjat ({series.length})</h2>

		{#if isLoading}
			<p class="loading">Ladataan sarjoja...</p>
		{:else if series.length === 0}
			<p class="no-series">Ei sarjoja. Lisää ensimmäinen sarja yllä olevalla lomakkeella.</p>
		{:else}
			<div class="series-table">
				<table>
					<thead>
						<tr>
							<th>Nimi</th>
							<th>Kausi</th>
							<th>Luotu</th>
							<th>Toiminnot</th>
						</tr>
					</thead>
					<tbody>
						{#each series as s}
							<tr>
								{#if editingSeriesId === s.id}
									<!-- Muokkaustila -->
									<td>
										<input
											type="text"
											bind:value={editSeriesName}
											class="edit-input"
										/>
									</td>
									<td>
										<input
											type="text"
											bind:value={editSeriesSeason}
											class="edit-input"
										/>
									</td>
									<td>{formatDate(s.created_at)}</td>
									<td>
										<button class="btn-save" onclick={() => saveEdit(s.id)}>Tallenna</button>
										<button class="btn-cancel" onclick={cancelEdit}>Peruuta</button>
									</td>
								{:else}
									<!-- Normaali näkymä -->
									<td><strong>{s.name}</strong></td>
									<td>{s.season || '-'}</td>
									<td>{formatDate(s.created_at)}</td>
									<td>
										<button class="btn-edit" onclick={() => startEdit(s)}>Muokkaa</button>
										<button class="btn-delete" onclick={() => deleteSeries(s.id, s.name)}>Poista</button>
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

	.add-series-section {
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

	.series-section {
		background-color: white;
		padding: 25px;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.loading, .no-series {
		text-align: center;
		color: #6c757d;
		padding: 20px;
	}

	.series-table {
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
