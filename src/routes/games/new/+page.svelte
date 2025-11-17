<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let isLoggedIn = $state(data.isLoggedIn);
	let currentUser = $state<any>(data.user);
	let userRole = $state<string>(data.user?.role || '');
	
	// Muokkaustila
	let editGameId = $state<number | null>(null);
	let isEditMode = $state(false);
	
	// Perustiedot
	let seriesId = $state<number | null>(null);
	let homeTeamId = $state<number | null>(null);
	let homeTeamName = $state('');
	let opponentName = $state('');
	let gameDate = $state(new Date().toISOString().split('T')[0]);
	let gameTime = $state('');
	let location = $state('');
	
	// Lisätiedot
	let notes = $state('');
	
	// Sarjat
	let series = $state<any[]>([]);
	let showNewSeriesModal = $state(false);
	let newSeriesName = $state('');
	let newSeriesSeason = $state('');
	
	// Joukkueet ja pelaajat
	let teams = $state<any[]>([]);
	let teamPlayers = $state<any[]>([]);
	let selectedPlayers = $state<number[]>([]);
	let showPlayerSelection = $state(false);
	
	// Kentälliset - 5 kenttää per neljä kenttää
	let showFieldModal = $state(false);
	let currentFieldSlot = $state<string | null>(null);
	let fieldPositions = $state<{
		goalkeeper: number | null;
		field1: { row1: (number | null)[], row2: (number | null)[] };
		field2: { row1: (number | null)[], row2: (number | null)[] };
		field3: { row1: (number | null)[], row2: (number | null)[] };
		field4: { row1: (number | null)[], row2: (number | null)[] };
	}>({
		goalkeeper: null,
		field1: { row1: [null, null, null], row2: [null, null] },
		field2: { row1: [null, null, null], row2: [null, null] },
		field3: { row1: [null, null, null], row2: [null, null] },
		field4: { row1: [null, null, null], row2: [null, null] }
	});
	
	let error = $state('');
	let successMessage = $state('');
	let isSaving = $state(false);
	
	// Hae joukkueet, sarjat ja mahdollinen muokattava peli kun komponentti latautuu
	onMount(async () => {
		await fetchSeries();
		await fetchTeams();
		
		// Tarkista onko URL:ssa edit-parametri
		const urlParams = new URLSearchParams(window.location.search);
		const editId = urlParams.get('edit');
		
		if (editId) {
			editGameId = parseInt(editId);
			isEditMode = true;
			await loadGameData(editGameId);
		}
	});
	
	async function fetchSeries() {
		try {
			const response = await fetch('/api/competitions');
			if (response.ok) {
				const data = await response.json();
				series = data.series || [];
			}
		} catch (error) {
			console.error('Virhe sarjojen haussa:', error);
		}
	}
	
	async function fetchTeams() {
		try {
			const response = await fetch('/api/admin/teams');
			if (response.ok) {
				teams = await response.json();
				console.log('Joukkueet haettu:', teams);
			}
		} catch (error) {
			console.error('Virhe joukkueiden haussa:', error);
		}
	}
	
	async function createSeries() {
		if (!newSeriesName.trim()) {
			error = 'Sarjan nimi on pakollinen';
			return;
		}
		
		try {
			const response = await fetch('/api/competitions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newSeriesName.trim(),
					season: newSeriesSeason.trim() || null
				})
			});
			
			if (response.ok) {
				const result = await response.json();
				await fetchSeries();
				seriesId = result.series.id;
				showNewSeriesModal = false;
				newSeriesName = '';
				newSeriesSeason = '';
			} else {
				const data = await response.json();
				error = data.error || 'Sarjan luominen epäonnistui';
			}
		} catch (err) {
			console.error('Error creating series:', err);
			error = 'Sarjan luominen epäonnistui';
		}
	}
	
	async function fetchTeamPlayers(teamId: number) {
		try {
			console.log('Haetaan pelaajia joukkueelle:', teamId);
			const response = await fetch(`/api/admin/teams/${teamId}/players`);
			console.log('Response status:', response.status);
			
			if (response.ok) {
				const data = await response.json();
				console.log('Pelaajat:', data);
				teamPlayers = data;
				showPlayerSelection = true;
			} else {
				const errorData = await response.json();
				console.error('API virhe:', errorData);
				error = errorData.error || 'Pelaajien haku epäonnistui';
			}
		} catch (err) {
			console.error('Virhe pelaajien haussa:', err);
			error = 'Pelaajien haku epäonnistui';
		}
	}
	
	async function loadGameData(gameId: number) {
		try {
			const response = await fetch(`/api/games/${gameId}?basic=true`);
			if (!response.ok) {
				throw new Error('Pelin lataaminen epäonnistui');
			}
			
			const game = await response.json();
			
			// Lataa pelin tiedot
			seriesId = game.series_id || null;
			homeTeamId = game.own_team_id;
			opponentName = game.opponentName || '';
			location = game.gameLocation || '';
			notes = game.notes || '';
			
			// Muunna päivämäärä oikeaan muotoon
			if (game.gameDate) {
				const date = new Date(game.gameDate);
				gameDate = date.toISOString().split('T')[0];
			}
			
			// Lataa kokoonpano
			if (game.lineup && game.lineup.length > 0) {
				selectedPlayers = game.lineup;
				
				// Lataa joukkueen pelaajat jotta ne voidaan näyttää
				if (homeTeamId) {
					await fetchTeamPlayers(homeTeamId);
				}
			}
			
			// Lataa kentälliset
			if (game.fieldPositions && game.fieldPositions.length === 21) {
				const fp = game.fieldPositions;
				fieldPositions.goalkeeper = fp[0] || null;
				fieldPositions.field1.row1 = [fp[1] || null, fp[2] || null, fp[3] || null];
				fieldPositions.field1.row2 = [fp[4] || null, fp[5] || null];
				fieldPositions.field2.row1 = [fp[6] || null, fp[7] || null, fp[8] || null];
				fieldPositions.field2.row2 = [fp[9] || null, fp[10] || null];
				fieldPositions.field3.row1 = [fp[11] || null, fp[12] || null, fp[13] || null];
				fieldPositions.field3.row2 = [fp[14] || null, fp[15] || null];
				fieldPositions.field4.row1 = [fp[16] || null, fp[17] || null, fp[18] || null];
				fieldPositions.field4.row2 = [fp[19] || null, fp[20] || null];
			}
			
		} catch (err) {
			console.error('Error loading game:', err);
			error = 'Pelin lataaminen epäonnistui';
		}
	}
	
	function togglePlayerSelection(playerId: number) {
		if (selectedPlayers.includes(playerId)) {
			selectedPlayers = selectedPlayers.filter(id => id !== playerId);
		} else {
			selectedPlayers = [...selectedPlayers, playerId];
		}
	}
	
	function closePlayerSelection() {
		showPlayerSelection = false;
	}
	
	// Kentälliset-funktiot
	function closeFieldModal() {
		showFieldModal = false;
		currentFieldSlot = null;
	}
	
	function assignPlayerToField(playerId: number, slot: string) {
		// Poista pelaaja muista paikoista jos on jo kentällä
		removePlayerFromField(playerId);
		
		// Lisää pelaaja valittuun paikkaan
		const [field, position] = slot.split('-');
		
		if (field === 'goalkeeper') {
			fieldPositions.goalkeeper = playerId;
		} else {
			const fieldNum = parseInt(field.replace('field', '')) as 1 | 2 | 3 | 4;
			const [row, index] = position.split('_').map(Number);
			
			if (row === 1) {
				(fieldPositions[`field${fieldNum}` as 'field1' | 'field2' | 'field3' | 'field4'] as any).row1[index] = playerId;
			} else {
				(fieldPositions[`field${fieldNum}` as 'field1' | 'field2' | 'field3' | 'field4'] as any).row2[index] = playerId;
			}
		}
		
		// Sulje dropdown mutta pidä modal auki
		currentFieldSlot = null;
	}
	
	function removePlayerFromField(playerId: number) {
		// Tarkista maalivahti
		if (fieldPositions.goalkeeper === playerId) {
			fieldPositions.goalkeeper = null;
			return;
		}
		
		// Tarkista kentät
		for (let i = 1; i <= 4; i++) {
			const fieldKey = `field${i}` as 'field1' | 'field2' | 'field3' | 'field4';
			const field = fieldPositions[fieldKey];
			
			// Row 1
			for (let j = 0; j < field.row1.length; j++) {
				if (field.row1[j] === playerId) {
					field.row1[j] = null;
					return;
				}
			}
			
			// Row 2
			for (let j = 0; j < field.row2.length; j++) {
				if (field.row2[j] === playerId) {
					field.row2[j] = null;
					return;
				}
			}
		}
	}
	
	function removePlayerFromSlot(slot: string) {
		const [field, position] = slot.split('-');
		
		if (field === 'goalkeeper') {
			fieldPositions.goalkeeper = null;
		} else {
			const fieldNum = parseInt(field.replace('field', ''));
			const fieldKey = `field${fieldNum}` as 'field1' | 'field2' | 'field3' | 'field4';
			const [row, index] = position.split('_').map(Number);
			
			if (row === 1) {
				fieldPositions[fieldKey].row1[index] = null;
			} else {
				fieldPositions[fieldKey].row2[index] = null;
			}
		}
	}
	
	function getPlayerById(playerId: number | null) {
		if (!playerId) return null;
		return teamPlayers.find(p => p.id === playerId);
	}
	
	function getAllFieldPlayerIds(): number[] {
		const ids: number[] = [];
		
		if (fieldPositions.goalkeeper) ids.push(fieldPositions.goalkeeper);
		
		for (let i = 1; i <= 4; i++) {
			const fieldKey = `field${i}` as 'field1' | 'field2' | 'field3' | 'field4';
			const field = fieldPositions[fieldKey];
			field.row1.forEach((id: number | null) => { if (id) ids.push(id); });
			field.row2.forEach((id: number | null) => { if (id) ids.push(id); });
		}
		
		return ids;
	}
	
	// Suodata pelaajat jotka eivät ole kentällä
	let availablePlayers = $derived(
		teamPlayers.filter(p => 
			selectedPlayers.includes(p.id) && !getAllFieldPlayerIds().includes(p.id)
		)
	);
	
	async function createGame() {
		error = '';
		successMessage = '';
		
		// Validointi
		if (!homeTeamId) {
			error = 'Oma joukkue on pakollinen';
			return;
		}
		
		if (!opponentName.trim()) {
			error = 'Vastustaja on pakollinen';
			return;
		}
		
		if (!gameDate) {
			error = 'Pelin päivämäärä on pakollinen';
			return;
		}
		
		isSaving = true;
		
		try {
			// Muunna fieldPositions arrayiksi tietokantaa varten
			const fieldPositionsArray: (number | null)[] = [
				fieldPositions.goalkeeper,
				...fieldPositions.field1.row1,
				...fieldPositions.field1.row2,
				...fieldPositions.field2.row1,
				...fieldPositions.field2.row2,
				...fieldPositions.field3.row1,
				...fieldPositions.field3.row2,
				...fieldPositions.field4.row1,
				...fieldPositions.field4.row2
			];
			
			const gameData = {
				seriesId: seriesId,
				ownTeamId: homeTeamId,
				opponentName: opponentName.trim(),
				gameLocation: location.trim() || null,
				gameDate: gameDate,
				lineup: selectedPlayers,
				fieldPositions: fieldPositionsArray,
				notes: notes.trim() || null,
				status: 'Luotu'
			};
			
			// Käytä PUT muokkaustilassa, POST uudelle pelille
			const url = isEditMode ? `/api/games/${editGameId}` : '/api/games';
			const method = isEditMode ? 'PUT' : 'POST';
			
			const response = await fetch(url, {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(gameData)
			});
			
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || (isEditMode ? 'Pelin päivitys epäonnistui' : 'Pelin luominen epäonnistui'));
			}
			
			const result = await response.json();
			
			// Ohjaa pelit-sivulle tallennuksen jälkeen
			if (typeof window !== 'undefined') {
				goto('/games');
			}
			
		} catch (err) {
			error = err instanceof Error ? err.message : (isEditMode ? 'Virhe päivittäessä peliä' : 'Virhe luotaessa peliä');
		} finally {
			isSaving = false;
		}
	}
	
	function cancel() {
		if (typeof window !== 'undefined') {
			goto('/');
		}
	}
</script>

<div class="container">
	<header>
		<h1>{isEditMode ? 'Muokkaa peliä' : 'Luo uusi peli'}</h1>
	</header>
	
	{#if error}
		<div class="error-message">{error}</div>
	{/if}
	
	{#if successMessage}
		<div class="success-message">{successMessage}</div>
	{/if}
	
	<!-- Uusi sarja -modal -->
	{#if showNewSeriesModal}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={() => showNewSeriesModal = false}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="series-modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Luo uusi sarja</h3>
					<button type="button" class="modal-close" onclick={() => showNewSeriesModal = false}>&times;</button>
				</div>
				
				<div class="modal-body">
					<div class="form-group">
						<label for="newCompName">Sarjan nimi *</label>
						<input 
							type="text" 
							id="newCompName" 
							bind:value={newSeriesName}
							placeholder="Esim. Sarja A"
							required
						/>
					</div>
					
					<div class="form-group">
						<label for="newCompSeason">Kausi</label>
						<input 
							type="text" 
							id="newCompSeason" 
							bind:value={newSeriesSeason}
							placeholder="Esim. 2024-2025"
						/>
					</div>
				</div>
				
				<div class="modal-footer">
					<button type="button" class="cancel-button" onclick={() => showNewSeriesModal = false}>
						Peruuta
					</button>
					<button type="button" class="save-button" onclick={createSeries}>
						Tallenna
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Pelaajien valintamodaali -->
	{#if showPlayerSelection}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={closePlayerSelection}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="player-modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Valitse pelaajat</h3>
					<button type="button" class="modal-close" onclick={closePlayerSelection}>&times;</button>
				</div>
				
				<div class="player-list">
					{#if teamPlayers.length === 0}
						<p class="no-players">Ei pelaajia valitussa joukkueessa</p>
					{:else}
						<table>
							<thead>
								<tr>
									<th>Valitse</th>
									<th>Nimi</th>
									<th>Pelipaikka</th>
									<th>Pelinumero</th>
								</tr>
							</thead>
							<tbody>
								{#each [...teamPlayers].sort((a, b) => a.last_name.localeCompare(b.last_name)) as player}
									<tr>
										<td>
											<input 
												type="checkbox" 
												checked={selectedPlayers.includes(player.id)}
												onchange={() => togglePlayerSelection(player.id)}
											/>
										</td>
										<td>{player.first_name} {player.last_name}</td>
										<td>{player.position || '-'}</td>
										<td>{player.jersey_number || '-'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
				
				<div class="modal-footer">
					<button type="button" class="done-button" onclick={closePlayerSelection}>
						Valmis ({selectedPlayers.length} valittu)
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Kentälliset-modaali -->
	{#if showFieldModal}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={closeFieldModal}>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="field-modal" onclick={(e) => e.stopPropagation()}>
				<button type="button" class="modal-close-absolute" onclick={closeFieldModal}>&times;</button>
				
				<div class="field-layout">
				<!-- Maalivahti -->
				<div class="field-section">
					<h4>Maalivahti</h4>
					<div class="field-slot-container">
						<button 
							type="button"
							class="field-slot-button"
							onclick={() => {
								if (fieldPositions.goalkeeper) {
									removePlayerFromSlot('goalkeeper');
								} else {
									currentFieldSlot = 'goalkeeper';
								}
							}}
						>
							{getPlayerById(fieldPositions.goalkeeper)?.nick || 'Valitse'}
						</button>
						{#if currentFieldSlot === 'goalkeeper'}
							<select 
								class="player-dropdown-select"
								onchange={(e) => {
									const playerId = parseInt(e.currentTarget.value);
									if (playerId) {
										assignPlayerToField(playerId, 'goalkeeper');
									}
								}}
							>
								<option value="">-- Valitse pelaaja --</option>
								{#each availablePlayers as player}
									<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>					<!-- 1. kenttä -->
					<div class="field-section">
						<h4>1. kenttä</h4>
						<div class="field-row">
							{#each [0, 1, 2] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field1-1_${i}`;
											if (fieldPositions.field1.row1[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field1.row1[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field1-1_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field1-1_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
						<div class="field-row">
							{#each [0, 1] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field1-2_${i}`;
											if (fieldPositions.field1.row2[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field1.row2[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field1-2_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field1-2_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
					</div>
					
					<!-- 2. kenttä -->
					<div class="field-section">
						<h4>2. kenttä</h4>
						<div class="field-row">
							{#each [0, 1, 2] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field2-1_${i}`;
											if (fieldPositions.field2.row1[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field2.row1[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field2-1_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field2-1_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
						<div class="field-row">
							{#each [0, 1] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field2-2_${i}`;
											if (fieldPositions.field2.row2[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field2.row2[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field2-2_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field2-2_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
					</div>
					
					<!-- 3. kenttä -->
					<div class="field-section">
						<h4>3. kenttä</h4>
						<div class="field-row">
							{#each [0, 1, 2] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field3-1_${i}`;
											if (fieldPositions.field3.row1[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field3.row1[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field3-1_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field3-1_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
						<div class="field-row">
							{#each [0, 1] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field3-2_${i}`;
											if (fieldPositions.field3.row2[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field3.row2[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field3-2_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field3-2_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
					</div>
					
					<!-- 4. kenttä -->
					<div class="field-section">
						<h4>4. kenttä</h4>
						<div class="field-row">
							{#each [0, 1, 2] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field4-1_${i}`;
											if (fieldPositions.field4.row1[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field4.row1[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field4-1_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field4-1_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
						<div class="field-row">
							{#each [0, 1] as i}
								<div class="field-slot-container">
									<button 
										type="button"
										class="field-slot-button"
										onclick={() => {
											const slot = `field4-2_${i}`;
											if (fieldPositions.field4.row2[i]) {
												removePlayerFromSlot(slot);
											} else {
												currentFieldSlot = slot;
											}
										}}
									>
										{getPlayerById(fieldPositions.field4.row2[i])?.nick || 'Valitse'}
									</button>
									{#if currentFieldSlot === `field4-2_${i}`}
										<select 
											class="player-dropdown-select"
											onchange={(e) => {
												const playerId = parseInt(e.currentTarget.value);
												if (playerId) {
													assignPlayerToField(playerId, `field4-2_${i}`);
												}
											}}
										>
											<option value="">-- Valitse pelaaja --</option>
											{#each availablePlayers as player}
												<option value={player.id}>{player.nick || `${player.first_name} ${player.last_name}`}</option>
											{/each}
										</select>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
				
				<div class="modal-footer">
					<button type="button" class="cancel-button" onclick={closeFieldModal}>
						Peruuta
					</button>
					<button type="button" class="done-button" onclick={closeFieldModal}>
						Tallenna
					</button>
				</div>
			</div>
		</div>
	{/if}
	
	<form onsubmit={(e) => { e.preventDefault(); createGame(); }}>
		<section class="form-section">
			<h2>Perustiedot</h2>
			
			<div class="form-group">
				<label for="series">Pelattava sarja</label>
				<div class="series-selector">
					<select 
						id="series" 
						bind:value={seriesId}
					>
						<option value={null}>Ei sarjaa</option>
						{#each series as s}
							<option value={s.id}>{s.name}{s.season ? ` (${s.season})` : ''}</option>
						{/each}
					</select>
					<button 
						type="button" 
						class="add-series-btn"
						onclick={() => showNewSeriesModal = true}
					>
						+ Uusi sarja
					</button>
				</div>
			</div>
			
			<div class="form-group">
				<label for="homeTeam">Oma joukkue *</label>
				<select 
					id="homeTeam" 
					bind:value={homeTeamId}
					onchange={(e) => {
						const team = teams.find(t => t.id === Number(e.currentTarget.value));
						if (team) homeTeamName = team.name;
					}}
					required
				>
					<option value="">Valitse joukkue</option>
					{#each teams as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			</div>
			
			<div class="form-group">
				<label for="opponent">Vastustaja *</label>
				<input 
					type="text" 
					id="opponent" 
					bind:value={opponentName}
					placeholder="Vastustajan nimi"
					required
				/>
			</div>
			
			<div class="form-row">
				<div class="form-group">
					<label for="gameDate">Päivämäärä *</label>
					<input 
						type="date" 
						id="gameDate" 
						bind:value={gameDate}
						required
					/>
				</div>
				
				<div class="form-group">
					<label for="gameTime">Kellonaika</label>
					<input 
						type="time" 
						id="gameTime" 
						bind:value={gameTime}
					/>
				</div>
			</div>
			
			<div class="form-group">
				<label for="location">Pelipaikka</label>
				<input 
					type="text" 
					id="location" 
					bind:value={location}
					placeholder="Hallin tai kentän nimi"
				/>
			</div>
		</section>
		
		<section class="form-section">
			<h2>Lisätiedot</h2>
			
			<div class="form-group">
				<label>Kokoonpano</label>
				<button 
					type="button" 
					class="select-players-button"
					onclick={() => homeTeamId && fetchTeamPlayers(homeTeamId)}
					disabled={!homeTeamId}
				>
					Valitse pelaajat ({selectedPlayers.length} valittu)
				</button>
			</div>
			
			<div class="form-group">
				<button 
					type="button" 
					class="field-setup-button"
					onclick={() => showFieldModal = true}
					disabled={selectedPlayers.length === 0}
				>
					Kentälliset ({getAllFieldPlayerIds().length} valittu)
				</button>
			</div>
			
			<div class="form-group">
				<label for="notes">Muistiinpanot</label>
				<textarea 
					id="notes" 
					bind:value={notes}
					placeholder="Lisätietoja pelistä..."
					rows="4"
				></textarea>
			</div>
		</section>
		
		<div class="button-group">
			<button type="button" class="cancel-button" onclick={cancel}>Peruuta</button>
			<button type="submit" class="save-button" disabled={isSaving}>
				{isSaving ? 'Tallennetaan...' : 'Tallenna'}
			</button>
		</div>
	</form>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		padding-top: 80px;
		min-height: 100vh;
		background-color: #f0f0f0;
	}
	
	header {
		text-align: center;
		margin-bottom: 30px;
	}
	
	h1 {
		font-size: 2rem;
		font-weight: bold;
		margin: 0;
		color: #1a1a1a;
	}
	
	.error-message {
		background-color: #fee;
		color: #c33;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		text-align: center;
	}
	
	.success-message {
		background-color: #d4edda;
		color: #155724;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		text-align: center;
	}
	
	form {
		background: white;
		padding: 30px;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.form-section {
		margin-bottom: 30px;
	}
	
	.form-section:last-of-type {
		margin-bottom: 0;
	}
	
	.form-section h2 {
		font-size: 1.3rem;
		font-weight: 600;
		margin: 0 0 20px 0;
		color: #333;
		border-bottom: 2px solid #5b9bd5;
		padding-bottom: 8px;
	}
	
	.form-group {
		margin-bottom: 20px;
	}
	
	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}
	
	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #333;
		font-size: 0.95rem;
	}
	
	.series-selector {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	
	.series-selector select {
		flex: 1;
	}
	
	.add-series-btn {
		padding: 10px 16px;
		background-color: #28a745;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: background-color 0.2s;
	}
	
	.add-series-btn:hover {
		background-color: #218838;
	}
	
	input[type="text"],
	input[type="date"],
	input[type="time"],
	select,
	textarea {
		width: 100%;
		padding: 10px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		background-color: white;
		box-sizing: border-box;
	}
	
	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #5b9bd5;
	}
	
	textarea {
		resize: vertical;
		font-family: inherit;
	}
	
	.button-group {
		display: flex;
		gap: 15px;
		margin-top: 30px;
	}
	
	.cancel-button,
	.save-button {
		flex: 1;
		padding: 15px 30px;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.cancel-button {
		background-color: #6c757d;
		color: white;
	}
	
	.cancel-button:hover {
		background-color: #5a6268;
	}
	
	.save-button {
		background-color: #5b9bd5;
		color: white;
	}
	
	.save-button:hover:not(:disabled) {
		background-color: #4a8cc4;
	}
	
	.save-button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
	
	.select-players-button {
		width: 100%;
		padding: 12px;
		background-color: #5b9bd5;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.select-players-button:hover:not(:disabled) {
		background-color: #4a8cc4;
	}
	
	.select-players-button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
	
	/* Pelaajien valintamodaali */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 20px;
	}
	
	.series-modal {
		background: white;
		border-radius: 12px;
		max-width: 500px;
		width: 90%;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}
	
	.modal-body {
		padding: 20px 30px;
	}
	
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 20px 30px;
		border-top: 1px solid #dee2e6;
		background-color: #f8f9fa;
	}
	
	.player-modal {
		background: white;
		border-radius: 12px;
		max-width: 700px;
		width: 100%;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 25px 30px;
		border-bottom: none;
		background-color: #f8f9fa;
	}
	
	.modal-header h3 {
		margin: 0;
		font-size: 1.8rem;
		color: #000;
		font-weight: 700;
	}
	
	.modal-close {
		background: none;
		border: none;
		font-size: 2rem;
		cursor: pointer;
		color: #666;
		line-height: 1;
		padding: 0;
		width: 30px;
		height: 30px;
	}
	
	.modal-close:hover {
		color: #333;
	}
	
	.modal-close-absolute {
		position: absolute;
		top: 15px;
		right: 15px;
		background: none;
		border: none;
		font-size: 2.5rem;
		cursor: pointer;
		color: #666;
		line-height: 1;
		padding: 0;
		width: 40px;
		height: 40px;
		z-index: 10;
		transition: color 0.2s;
	}
	
	.modal-close-absolute:hover {
		color: #333;
	}
	
	.player-list {
		flex: 1;
		overflow-y: auto;
		padding: 20px 25px;
	}
	
	.no-players {
		text-align: center;
		color: #666;
		padding: 40px 20px;
		font-size: 1.1rem;
	}
	
	.player-list table {
		width: 100%;
		border-collapse: collapse;
	}
	
	.player-list thead {
		background-color: #f8f9fa;
		position: sticky;
		top: 0;
	}
	
	.player-list th {
		padding: 12px;
		text-align: left;
		font-weight: 600;
		color: #333;
		border-bottom: 2px solid #dee2e6;
	}
	
	.player-list td {
		padding: 12px;
		border-bottom: 1px solid #eee;
	}
	
	.player-list tr:hover {
		background-color: #f8f9fa;
	}
	
	.player-list input[type="checkbox"] {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}
	
	.modal-footer {
		padding: 25px;
		border-top: none;
		display: flex;
		gap: 20px;
		justify-content: center;
		background-color: white;
	}
	
	.cancel-button {
		padding: 15px 50px;
		background-color: #6c757d;
		color: white;
		border: none;
		border-radius: 10px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 160px;
	}
	
	.cancel-button:hover {
		background-color: #5a6268;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	
	.done-button {
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
	
	.done-button:hover {
		background-color: #4a8cc4;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	
	/* Kentälliset-modal */
	.field-modal {
		position: relative;
		background: white;
		border-radius: 16px;
		max-width: 850px;
		width: 95%;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}
	
	.field-layout {
		padding: 30px 25px 20px;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
	}
	
	.field-section {
		width: 100%;
		max-width: 700px;
		padding: 0;
		background-color: transparent;
		border-radius: 8px;
	}
	
	.field-section h4 {
		margin: 0 0 20px 0;
		font-size: 1.3rem;
		color: #000;
		text-align: center;
		font-weight: 700;
	}
	
	.field-row {
		display: flex;
		gap: 12px;
		justify-content: center;
		margin-bottom: 12px;
	}
	
	.field-row:last-child {
		margin-bottom: 0;
	}
	
	.field-slot-button {
		min-width: 180px;
		padding: 18px 15px;
		background-color: #5b9bd5;
		color: #000;
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.field-slot-button:hover {
		background-color: #4a8cc4;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}
	
	.field-setup-button {
		width: 100%;
		padding: 12px;
		background-color: #5b9bd5;
		color: #000;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.field-setup-button:hover:not(:disabled) {
		background-color: #4a8cc4;
	}
	
	.field-setup-button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
	
	.field-slot-container {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 180px;
	}
	
	.player-dropdown-select {
		width: 100%;
		padding: 12px 10px;
		border: 2px solid #5b9bd5;
		border-radius: 8px;
		font-size: 0.95rem;
		background-color: white;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	
	.player-dropdown-select:hover {
		border-color: #4a8cc4;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}
	
	.player-dropdown-select:focus {
		outline: none;
		border-color: #3a7cb3;
		box-shadow: 0 0 0 3px rgba(91, 155, 213, 0.2);
	}
	
	@media (max-width: 768px) {
		.container {
			padding: 15px;
			padding-top: 70px;
		}
		
		form {
			padding: 20px;
		}
		
		h1 {
			font-size: 1.5rem;
		}
		
		.form-section h2 {
			font-size: 1.1rem;
		}
		
		.form-row {
			grid-template-columns: 1fr;
			gap: 0;
		}
		
		.button-group {
			flex-direction: column;
		}
		
		.cancel-button,
		.save-button {
			width: 100%;
		}
		
		.player-modal {
			max-height: 90vh;
		}
		
		.modal-header {
			padding: 15px 20px;
		}
		
		.modal-header h3 {
			font-size: 1.2rem;
		}
		
		.player-list {
			padding: 15px 20px;
		}
		
		.player-list table {
			font-size: 0.9rem;
		}
		
		.player-list th,
		.player-list td {
			padding: 8px;
		}
		
		/* Kentälliset-modal mobiilissa */
		.field-modal {
			width: 100%;
			max-width: 100%;
			max-height: 100vh;
			border-radius: 0;
		}
		
		.field-layout {
			padding: 15px 8px;
			gap: 8px;
		}
		
		.field-section {
			max-width: 100%;
		}
		
		.field-section h4 {
			font-size: 1rem;
			margin-bottom: 8px;
		}
		
		.field-row {
			gap: 8px;
			margin-bottom: 8px;
		}
		
		.field-slot-container {
			min-width: 0;
			flex: 1;
		}
		
		.field-slot-button {
			padding: 8px 4px;
			font-size: 0.75rem;
			min-height: 38px;
			min-width: 0;
		}
		
		.player-dropdown-select {
			padding: 6px 4px;
			font-size: 0.75rem;
		}
		
		.field-actions {
			padding: 10px 8px;
			gap: 8px;
		}
		
		.field-actions button {
			padding: 10px 16px;
			font-size: 0.9rem;
		}
	}
</style>
