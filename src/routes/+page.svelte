<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let opponentTeamName = $state('');
	let goalkeeperName = $state(''); // Aloitusnäytön maalivahti tekstikentästä
	let goalkeepers = $state<any[]>([]);
	let isSaving = $state(false);
	let saveMessage = $state('');
	let isLoggedIn = $state(data.isLoggedIn);
	let currentUser = $state<any>(data.user);
	let userRole = $state<string>(data.user?.role || '');
	let showMenu = $state(false);
	let showLoginModal = $state(false);
	let showRegisterModal = $state(false);
	let showForgotPasswordModal = $state(false);
	let loginUsername = $state('');
	let loginPassword = $state('');
	let loginError = $state('');
	let isLoggingIn = $state(false);
	
	// Pelin tiedot ja kentälliset
	let currentGameId = $state<number | null>(null);
	let currentGame = $state<any>(null);
	let showFieldPositionsModal = $state(false);
	let players = $state<any[]>([]);
	let fieldPositions = $state<(number | null)[]>(Array(21).fill(null));
	let currentFieldSlot = $state<number | null>(null);
	let pollInterval: number | null = null;
	
	// Maalin kirjaus
	let showGoalModal = $state(false);
	let goalType = $state<'NM' | 'AV' | 'YV' | 'TM' | 'RL'>('NM');
	let selectedPlayers = $state<number[]>([]);
	let modalStep = $state<'players' | 'scorer'>('players'); // Vaihe 1: pelaajat, Vaihe 2: maalintekijä ja syöttäjä
	let goalScorer = $state<number | null>(null);
	let goalAssist = $state<number | null>(null);
	let isOpponentGoal = $state(false); // Onko vastustajan maali
	
	// Maalivahdin nimi lasketaan automaattisesti kentällisistä
	const selectedGoalkeeper = $derived.by(() => {
		const goalkeeperPlayerId = fieldPositions[0];
		if (goalkeeperPlayerId && Array.isArray(players) && players.length > 0) {
			const goalkeeper = players.find(p => p.id === goalkeeperPlayerId);
			if (goalkeeper) {
				return `${goalkeeper.first_name} ${goalkeeper.last_name}`;
			}
		}
		return '';
	});
	
	// Rekisteröitymislomakkeen kentät
	let registerUsername = $state('');
	let registerPassword = $state('');
	let registerFirstName = $state('');
	let registerLastName = $state('');
	let registerEmail = $state('');
	let registerError = $state('');
	let isRegistering = $state(false);
	
	// Salasanan palautus
	let forgotPasswordUsername = $state('');
	let forgotPasswordError = $state('');
	let forgotPasswordSuccess = $state('');
	let isSendingPassword = $state(false);

	// Tilastot (ei eräkohtaisia)
	let ownBlockedShots = $state(0);
	let ownMissedShots = $state(0);
	let ownBlocks = $state(0);
	let ownSaves = $state(0);
	let ownCatches = $state(0);
	let oppSaves = $state(0);
	let oppMissed = $state(0);
	let oppBlocks = $state(0);
	
	// Maalit lasketaan games taulukosta
	let ownGoals = $derived(currentGame?.team_goals?.length || 0);
	let oppGoals = $derived(currentGame?.opponent_goals?.length || 0);

	// Lasketut arvot
	let totalOwnShotsOnGoal = $derived(ownGoals + oppSaves + ownBlockedShots);
	let ownGoalieSavePercentage = $derived.by(() => {
		const totalShotsAgainst = ownSaves + oppGoals;
		if (totalShotsAgainst === 0) return '0.0';
		return ((ownSaves / totalShotsAgainst) * 100).toFixed(1);
	});
	let oppGoalieSavePercentage = $derived.by(() => {
		const totalShots = oppSaves + ownGoals;
		if (totalShots === 0) return '0.0';
		return ((oppSaves / totalShots) * 100).toFixed(1);
	});

	let history: Array<{
		team: 'own' | 'opp';
		stat: string;
		value: number;
	}> = $state([]);

	// Päivitä state kun data muuttuu
	$effect(() => {
		isLoggedIn = data.isLoggedIn;
		currentUser = data.user;
		userRole = data.user?.role || '';
		
		// Hae maalivahdit kun komponentti latautuu
		fetchGoalkeepers();
	});

	onMount(async () => {
		// Tarkista onko URL:ssa game-parametri
		const urlParams = new URLSearchParams(window.location.search);
		const gameId = urlParams.get('game');
		
		if (gameId) {
			currentGameId = parseInt(gameId);
			await loadGameData(currentGameId);
			startPolling();
		}
		
		// Siivoa polling kun komponentti poistetaan
		return () => {
			stopPolling();
		};
	});

	async function loadGameData(gameId: number, isPolling = false) {
		try {
			const response = await fetch(`/api/games/${gameId}?basic=true`);
			if (response.ok) {
				const gameData = await response.json();
				
				// Ensimmäisellä latauksella asetetaan kaikki
				if (!isPolling) {
					currentGame = gameData;
					opponentTeamName = gameData.opponentName || '';
					
					// Aseta kentälliset
					if (gameData.fieldPositions) {
						fieldPositions = gameData.fieldPositions;
					}
					
					// Hae kaikki pelaajat
					await fetchPlayers();
					
					// Suodata pelaajat lineup-sarakkeen perusteella
					if (gameData.lineup && Array.isArray(gameData.lineup)) {
						players = players.filter(p => gameData.lineup.includes(p.id));
					}
				} else {
					// Pollingissa päivitetään vain tiedot, ei fieldPositions jos modal on auki
					currentGame = gameData;
					opponentTeamName = gameData.opponentName || '';
					
					// Päivitä kentälliset vain jos modal ei ole auki
					if (!showFieldPositionsModal && gameData.fieldPositions) {
						fieldPositions = gameData.fieldPositions;
					}
				}
			}
		} catch (error) {
			console.error('Virhe pelin tietojen haussa:', error);
		}
	}

	function startPolling() {
		if (pollInterval || !currentGameId) return;
		
		pollInterval = setInterval(() => {
			if (currentGameId) {
				loadGameData(currentGameId, true);
			}
		}, 3000); // Päivitä 3 sekunnin välein
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	async function fetchPlayers() {
		try {
			const response = await fetch('/api/admin/players');
			if (response.ok) {
				const data = await response.json();
				players = data.players || [];
			}
		} catch (error) {
			console.error('Virhe pelaajien haussa:', error);
		}
	}

	function openPlayerSelector(position: number) {
		if (fieldPositions[position]) {
			// Jos paikalla on jo pelaaja, poista se
			fieldPositions[position] = null;
			saveFieldPositions();
		} else {
			// Avaa dropdown
			currentFieldSlot = position;
		}
	}

	function assignPlayerToPosition(playerId: number, position: number) {
		// Poista pelaaja muista paikoista
		for (let i = 0; i < fieldPositions.length; i++) {
			if (fieldPositions[i] === playerId) {
				fieldPositions[i] = null;
			}
		}
		
		// Aseta pelaaja uuteen paikkaan
		fieldPositions[position] = playerId;
		
		// Sulje dropdown ja tallenna
		currentFieldSlot = null;
		saveFieldPositions();
	}

	// Käytettävissä olevat pelaajat (ei ole vielä kentällä)
	const availablePlayers = $derived(
		players.filter(p => !fieldPositions.includes(p.id))
	);

	async function saveFieldPositions() {
		if (!currentGameId || !currentGame) return;

		try {
			const response = await fetch(`/api/games/${currentGameId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					seriesId: currentGame.series_id,
					ownTeamId: currentGame.own_team_id,
					opponentName: currentGame.opponentName,
					gameLocation: currentGame.gameLocation,
					gameDate: currentGame.gameDate,
					lineup: currentGame.lineup,
					fieldPositions: fieldPositions,
					status: currentGame.status,
					notes: currentGame.notes
				})
			});
			
			if (!response.ok) {
				const error = await response.text();
				console.error('Tallennus epäonnistui:', response.status, error);
			} else {
				console.log('Kentälliset tallennettu onnistuneesti');
			}
		} catch (err) {
			console.error('Virhe tallennuksessa:', err);
		}
	}

	async function fetchGoalkeepers() {
		try {
			const response = await fetch('/api/admin/players');
			if (response.ok) {
				const data = await response.json();
				const playersData = data.players || [];
				goalkeepers = playersData.filter((p: any) => p.position === 'Maalivahti');
			}
		} catch (error) {
			console.error('Virhe maalivahtien haussa:', error);
		}
	}

	function openGoalModal(isOpponent = false) {
		goalType = 'NM';
		selectedPlayers = [];
		modalStep = 'players';
		goalScorer = null;
		goalAssist = null;
		isOpponentGoal = isOpponent;
		showGoalModal = true;
	}

	function closeGoalModal() {
		showGoalModal = false;
		selectedPlayers = [];
		modalStep = 'players';
		goalScorer = null;
		goalAssist = null;
	}

	async function confirmGoal() {
		if (modalStep === 'players') {
			// Vaihe 1: Vastustajan maalissa tarkista että NM tai TM
			if (isOpponentGoal) {
				if (goalType !== 'NM' && goalType !== 'TM') {
					// Vain NM ja TM sallittu vastustajan maaleissa
					// Jos jokin muu valittuna, älä vaadi pelaajia
				}
				
				// Jos NM tai TM, tarkista että pelaajia valittu
				if ((goalType === 'NM' || goalType === 'TM') && selectedPlayers.length === 0) {
					alert('Valitse kentällä olevat pelaajat');
					return;
				}
				
				// Tallenna minus_points ja goal_type taustalla
				const playersToSave = [...selectedPlayers];
				selectedPlayers = [];
				try {
					// Tallenna goal_type ja minus_points
					await fetch(`/api/games/${currentGameId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							minus_points: playersToSave,
							goal_type: goalType
						})
					});
					// Tallenna opponent_goals (TM = "TM", muuten maalivahti ID)
					const opponentGoalValue = goalType === 'TM' ? 'TM' : fieldPositions[0];
					await fetch(`/api/games/${currentGameId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							opponent_goal: opponentGoalValue
						})
					});
					// Päivitä pelin tiedot
					await loadGameData(currentGameId, true);
					history = [...history, { team: 'opp', stat: 'goals', value: oppGoals }];
					closeGoalModal();
				} catch (error) {
					console.error('Virhe tallennettaessa vastustajan maalia:', error);
					alert('Tallennus epäonnistui');
				}
				return;
			}
			
			// Oma maali: Tarkista tarvitaanko plus_points
			// AV, YV, TM, RL ei tarvitse plus pisteitä, vain NM
			const needsPlusPoints = goalType === 'NM';
			
			if (needsPlusPoints && selectedPlayers.length === 0) {
				alert('Valitse vähintään yksi pelaaja');
				return;
			}
			
			// Siirry heti vaiheeseen 2 (sujuvuuden vuoksi)
			modalStep = 'scorer';
			const playersToSave = [...selectedPlayers]; // Tallenna kopio
			selectedPlayers = []; // Tyhjennä valinnat
			
			// Jos NM, tallenna plus_points taustalla
			if (needsPlusPoints) {
				fetch(`/api/games/${currentGameId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						plus_points: playersToSave
					})
				}).catch(error => {
					console.error('Virhe tallennettaessa plus_points:', error);
				});
			}
			// AV, YV, TM, RL: Ei tallenneta mitään vaiheessa 1
		} else if (modalStep === 'scorer') {
			// Vaihe 2: Maalintekijä pakollinen, päivitä team_goals, assists ja goal_type
			if (!goalScorer) {
				alert('Valitse maalintekijä');
				return;
			}
			
			try {
				// Tallenna goal_type (aina vaiheessa 2)
				// Jos ei NM, tallenna tyhjä plus_points array
				const plusPointsToSave = goalType === 'NM' ? [] : []; // Tyhjä array jos ei NM (NM:llä plus_points tallennettu jo vaiheessa 1)
				
				const response1 = await fetch(`/api/games/${currentGameId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						plus_points: plusPointsToSave,
						goal_type: goalType
					})
				});
				
				if (!response1.ok) {
					const errorData = await response1.json();
					console.error('API virhe goal_type tallennuksessa:', errorData);
					throw new Error('goal_type päivitys epäonnistui');
				}
				
				// Tallenna maalintekijä ja syöttäjä
				const response = await fetch(`/api/games/${currentGameId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						team_goals: goalScorer,
						assists: goalAssist
					})
				});
				
				if (!response.ok) {
					const errorData = await response.json();
					console.error('API virhe:', errorData);
					throw new Error('Päivitys epäonnistui');
				}
				
				// Päivitä pelin tiedot jotta maalit näkyvät
				await loadGameData(currentGameId, true);
				
				history = [...history, { team: 'own', stat: 'goals', value: ownGoals }];
				
				closeGoalModal();
			} catch (error) {
				console.error('Virhe tallennettaessa:', error);
				alert('Tallennus epäonnistui');
			}
		}
	}

	function togglePlayerSelection(playerId: number) {
		if (modalStep === 'players') {
			// Vaihe 1: Monivalinta
			if (selectedPlayers.includes(playerId)) {
				selectedPlayers = selectedPlayers.filter(id => id !== playerId);
			} else {
				selectedPlayers = [...selectedPlayers, playerId];
			}
		} else if (modalStep === 'scorer') {
			// Vaihe 2: Maalintekijä ja syöttäjä
			if (!goalScorer) {
				// Ensimmäinen valinta = maalintekijä
				goalScorer = playerId;
			} else if (goalScorer === playerId) {
				// Peruuta maalintekijä
				goalScorer = null;
			} else if (!goalAssist) {
				// Toinen valinta = syöttäjä
				goalAssist = playerId;
			} else if (goalAssist === playerId) {
				// Peruuta syöttäjä
				goalAssist = null;
			}
		}
	}

	async function increment(team: 'own' | 'opp', stat: string) {
		// Jos kyseessä on oma maali, avaa modaali
		if (team === 'own' && stat === 'goals') {
			openGoalModal(false);
			return;
		}
		
		// Jos kyseessä on vastustajan maali, avaa modaali
		if (team === 'opp' && stat === 'goals') {
			openGoalModal(true);
			return;
		}
		
		let currentValue = 0;
		
		if (team === 'own') {
			if (stat === 'blocked') { currentValue = ownBlockedShots; ownBlockedShots++; }
			else if (stat === 'missed') { currentValue = ownMissedShots; ownMissedShots++; }
			else if (stat === 'blocks') { currentValue = ownBlocks; ownBlocks++; }
			else if (stat === 'saves') { currentValue = ownSaves; ownSaves++; }
			else if (stat === 'catches') { currentValue = ownCatches; ownCatches++; }
		} else {
			if (stat === 'saves') { currentValue = oppSaves; oppSaves++; }
			else if (stat === 'missed') { currentValue = oppMissed; oppMissed++; }
			else if (stat === 'blocks') { currentValue = oppBlocks; oppBlocks++; }
		}

		history = [...history, { team, stat, value: currentValue }];
	}

	function undo() {
		if (history.length === 0) return;

		const last = history.pop();
		if (!last) return;

		const { team, stat } = last;

		if (team === 'own') {
			if (stat === 'goals') ownGoals--;
			else if (stat === 'blocked') ownBlockedShots--;
			else if (stat === 'missed') ownMissedShots--;
			else if (stat === 'blocks') ownBlocks--;
			else if (stat === 'saves') ownSaves--;
			else if (stat === 'catches') ownCatches--;
		} else {
			if (stat === 'goals') oppGoals--;
			else if (stat === 'saves') oppSaves--;
			else if (stat === 'missed') oppMissed--;
			else if (stat === 'blocks') oppBlocks--;
		}
	}

	function resetAllStats() {
		if (confirm('Haluatko varmasti nollata kaikki tilastot?')) {
			ownGoals = 0;
			ownBlockedShots = 0;
			ownMissedShots = 0;
			ownBlocks = 0;
			ownSaves = 0;
			ownCatches = 0;
			oppGoals = 0;
			oppSaves = 0;
			oppMissed = 0;
			oppBlocks = 0;
			history = [];
		}
	}

	let showSummaryView = $state(false);

	function showSummary() {
		showSummaryView = true;
	}

	function closeSummary() {
		showSummaryView = false;
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		isLoggedIn = false;
		showMenu = false;
		window.location.reload();
	}

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function closeMenu() {
		showMenu = false;
	}

	function navigateTo(path: string) {
		showMenu = false;
		window.location.href = path;
	}

	function openLoginModal() {
		showLoginModal = true;
		showMenu = false;
		loginError = '';
		loginUsername = '';
		loginPassword = '';
	}

	function closeLoginModal() {
		showLoginModal = false;
		loginError = '';
	}

	async function handleLogin() {
		loginError = '';
		isLoggingIn = true;

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					username: loginUsername, 
					password: loginPassword 
				})
			});

			const data = await response.json();

			if (response.ok) {
				isLoggedIn = true;
				currentUser = data.user;
				userRole = data.user.role || 'pelaaja';
				closeLoginModal();
				// Ei tehdä reloadia, päivitetään vain tila
			} else {
				loginError = data.error || 'Kirjautuminen epäonnistui';
			}
		} catch (error) {
			loginError = 'Yhteysvirhe. Yritä uudelleen.';
		} finally {
			isLoggingIn = false;
		}
	}

	function openRegisterModal() {
		showLoginModal = false;
		showRegisterModal = true;
		registerError = '';
		registerUsername = '';
		registerPassword = '';
		registerFirstName = '';
		registerLastName = '';
		registerEmail = '';
	}

	function closeRegisterModal() {
		showRegisterModal = false;
		registerError = '';
	}

	function openForgotPasswordModal() {
		showLoginModal = false;
		showForgotPasswordModal = true;
		forgotPasswordError = '';
		forgotPasswordSuccess = '';
		forgotPasswordUsername = '';
	}

	function closeForgotPasswordModal() {
		showForgotPasswordModal = false;
		forgotPasswordError = '';
		forgotPasswordSuccess = '';
	}

	async function handleForgotPassword() {
		forgotPasswordError = '';
		forgotPasswordSuccess = '';

		if (!forgotPasswordUsername) {
			forgotPasswordError = 'Syötä käyttäjätunnus';
			return;
		}

		isSendingPassword = true;

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: forgotPasswordUsername })
			});

			const data = await response.json();

			if (response.ok) {
				forgotPasswordSuccess = data.message;
				// Suljetaan modaali 5 sekunnin kuluttua
				setTimeout(() => {
					closeForgotPasswordModal();
					openLoginModal();
				}, 5000);
			} else {
				forgotPasswordError = data.error || 'Salasanan lähetys epäonnistui';
			}
		} catch (error) {
			forgotPasswordError = 'Yhteysvirhe. Yritä uudelleen.';
		} finally {
			isSendingPassword = false;
		}
	}

	async function handleRegister() {
		registerError = '';

		// Validointi
		if (!registerUsername || !registerPassword || !registerFirstName || !registerLastName || !registerEmail) {
			registerError = 'Kaikki kentät ovat pakollisia';
			return;
		}

		if (registerPassword.length < 6) {
			registerError = 'Salasanan tulee olla vähintään 6 merkkiä pitkä';
			return;
		}

		isRegistering = true;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					username: registerUsername,
					email: registerEmail,
					password: registerPassword,
					firstName: registerFirstName,
					lastName: registerLastName
				})
			});

			const data = await response.json();

			if (response.ok) {
				isLoggedIn = true;
				currentUser = data.user;
				userRole = data.user.role || 'pelaaja';
				closeRegisterModal();
				// Ei tehdä reloadia, päivitetään vain tila
			} else {
				// Näytä tarkempi virheviesti jos saatavilla
				registerError = data.details ? `${data.error}: ${data.details}` : (data.error || 'Rekisteröinti epäonnistui');
			}
		} catch (error) {
			registerError = 'Yhteysvirhe. Yritä uudelleen. ' + (error instanceof Error ? error.message : '');
		} finally {
			isRegistering = false;
		}
	}


</script>

<!-- Kirjautumis-modal -->
{#if showLoginModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeLoginModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<button class="modal-close" onclick={closeLoginModal}>&times;</button>
			
			<h2>Kirjaudu sisään</h2>
			
			{#if loginError}
				<div class="error-message">{loginError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
				<div class="form-group">
					<label for="modal-username">Käyttäjätunnus</label>
					<input 
						type="text" 
						id="modal-username" 
						bind:value={loginUsername}
						required 
						disabled={isLoggingIn}
					/>
				</div>

				<div class="form-group">
					<label for="modal-password">Salasana</label>
					<input 
						type="password" 
						id="modal-password" 
						bind:value={loginPassword}
						required 
						disabled={isLoggingIn}
					/>
				</div>

				<div class="modal-buttons">
					<button type="submit" class="btn-login" disabled={isLoggingIn}>
						{isLoggingIn ? 'Kirjaudutaan...' : 'Kirjaudu'}
					</button>
					<button type="button" class="btn-register" onclick={openRegisterModal}>
						Rekisteröidy
					</button>
				</div>
			</form>

			<div class="forgot-password-link">
				<button type="button" onclick={openForgotPasswordModal} class="link-button">
					Unohditko salasanan?
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Rekisteröitymis-modal -->
{#if showRegisterModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeRegisterModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<button class="modal-close" onclick={closeRegisterModal}>&times;</button>
			
			<h2>Rekisteröidy</h2>
			
			{#if registerError}
				<div class="error-message">{registerError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
				<div class="form-group">
					<label for="register-username">Käyttäjätunnus</label>
					<input 
						type="text" 
						id="register-username" 
						bind:value={registerUsername}
						required 
						disabled={isRegistering}
					/>
				</div>

				<div class="form-group">
					<label for="register-firstname">Etunimi</label>
					<input 
						type="text" 
						id="register-firstname" 
						bind:value={registerFirstName}
						required 
						disabled={isRegistering}
					/>
				</div>

				<div class="form-group">
					<label for="register-lastname">Sukunimi</label>
					<input 
						type="text" 
						id="register-lastname" 
						bind:value={registerLastName}
						required 
						disabled={isRegistering}
					/>
				</div>

				<div class="form-group">
					<label for="register-email">Sähköposti</label>
					<input 
						type="email" 
						id="register-email" 
						bind:value={registerEmail}
						required 
						disabled={isRegistering}
					/>
				</div>

				<div class="form-group">
					<label for="register-password">Salasana</label>
					<input 
						type="password" 
						id="register-password" 
						bind:value={registerPassword}
						required 
						disabled={isRegistering}
					/>
				</div>

				<div class="modal-buttons">
					<button type="submit" class="btn-login" disabled={isRegistering}>
						{isRegistering ? 'Rekisteröidään...' : 'Rekisteröidy'}
					</button>
					<button type="button" class="btn-cancel" onclick={closeRegisterModal}>
						Peruuta
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Salasana unohtunut -modal -->
		{#if showForgotPasswordModal}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="modal-overlay" onclick={closeForgotPasswordModal}>
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="modal-content" onclick={(e) => e.stopPropagation()}>
					<button class="modal-close" onclick={closeForgotPasswordModal}>&times;</button>
					
					<h2>Salasana unohtunut</h2>
					<p class="modal-description">Syötä käyttäjätunnuksesi, niin lähetämme uuden salasanan sähköpostiisi.</p>
					
					{#if forgotPasswordError}
						<div class="error-message">{forgotPasswordError}</div>
					{/if}

					{#if forgotPasswordSuccess}
						<div class="success-message">
							{forgotPasswordSuccess}
						</div>
					{/if}

					<form onsubmit={(e) => { e.preventDefault(); handleForgotPassword(); }}>
						<div class="form-group">
							<label for="forgot-username">Käyttäjätunnus</label>
							<input 
								type="text" 
								id="forgot-username" 
								bind:value={forgotPasswordUsername}
								required 
								disabled={isSendingPassword}
							/>
						</div>

						<div class="modal-buttons">
							<button type="submit" class="btn-login" disabled={isSendingPassword}>
								{isSendingPassword ? 'Lähetetään...' : 'Lähetä uusi salasana'}
							</button>
							<button type="button" class="btn-cancel" onclick={closeForgotPasswordModal}>
								Peruuta
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}

<div class="container">
	<header>
			{#if currentGameId !== null}
				<button class="field-positions-btn" onclick={() => {
					console.log('Kentälliset-nappi klikattu');
					showFieldPositionsModal = true;
				}}>
					Kentälliset ({fieldPositions.filter(id => id !== null).length})
				</button>
			{/if}

			{#if currentGameId !== null}
				<div class="game-info-display">
					<div class="info-item">
						<span class="info-label">Maalivahti:</span>
						<span class="info-value">{selectedGoalkeeper || '-'}</span>
					</div>
					<div class="info-item">
						<span class="info-label">Vastustaja:</span>
						<span class="info-value">{opponentTeamName || '-'}</span>
					</div>
				</div>
			{:else}
				<div class="game-info">
					<div class="form-group">
						<label for="goalkeeper">Maalivahti</label>
						<input 
							type="text" 
							id="goalkeeper" 
							bind:value={goalkeeperName}
							placeholder=""
						/>
					</div>
					<div class="form-group">
						<label for="opponent">Vastustaja</label>
						<input 
							type="text" 
							id="opponent" 
							bind:value={opponentTeamName}
							placeholder=""
						/>
					</div>
				</div>
			{/if}
		</header>

		<!-- Pistetilanne -->
		<div class="score-display">
			<span class="score">{ownGoals} - {oppGoals}</span>
		</div>

		<section class="stats-section">
			<div class="stats-row two-cols">
				<div class="stat-item">
					<span class="stat-label">Maali meille</span>
					<button class="stat-button green" onclick={() => { showGoalModal = true; }}>
						{ownGoals}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Maali vastustajalle</span>
					<button class="stat-button orange" onclick={() => increment('opp', 'goals')}>
						{oppGoals}
					</button>
				</div>
			</div>

			<h2>Pelitilanteet:</h2>
			<div class="stats-row">
				<div class="stat-item">
					<span class="stat-label">Veto maalia kohti</span>
					<button class="stat-button green" onclick={() => increment('opp', 'saves')}>
						{oppSaves}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Veto ohi</span>
					<button class="stat-button yellow" onclick={() => increment('own', 'missed')}>
						{ownMissedShots}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Veto blokkiin</span>
					<button class="stat-button yellow" onclick={() => increment('own', 'blocked')}>
						{ownBlockedShots}
					</button>
				</div>
			</div>

			<div class="stats-row two-cols">
				<div class="stat-item">
					<span class="stat-label">BlokkiPisteet</span>
					<button class="stat-button green" onclick={() => increment('own', 'blocks')}>
						{ownBlocks || 0}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Vastustajan vedot ohi maalin</span>
					<button class="stat-button green" onclick={() => increment('opp', 'missed')}>
						{oppMissed || 0}
					</button>
				</div>
			</div>

			<div class="stats-row two-cols">
				<div class="stat-item">
					<span class="stat-label">Torjunta</span>
					<button class="stat-button green" onclick={() => increment('own', 'saves')}>
						{ownSaves || 0}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Maalivahdin katko</span>
					<button class="stat-button green" onclick={() => increment('own', 'catches')}>
						{ownCatches || 0}
					</button>
				</div>
			</div>
		</section>

		<div class="action-buttons">
			   <button class="summary-button" onclick={showSummary}>Lopeta peli</button>
		</div>
</div>

<!-- Lopeta peli -modal -->
{#if showSummaryView}
	<div class="modal-overlay">
		<div class="summary-view">
			   <h1>Lopeta peli - {opponentTeamName || 'Vastustaja'}</h1>
			
			<!-- Lopputulos -->
			<div class="final-score">
				<h2>Lopputulos</h2>
				<div class="score-big">
					{ownGoals} - {oppGoals}
				</div>
			</div>

			<!-- Koko pelin yhteenveto -->
			<div class="game-summary">
				<h2>Pelin tilastot</h2>
				
				<div class="summary-stats">
					<div class="summary-item">
						<span class="stat-name">Meidän maalit:</span>
						<span class="stat-value">{ownGoals}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Vastustajan maalit:</span>
						<span class="stat-value">{oppGoals}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Laukaukset maalia kohti:</span>
						<span class="stat-value">{oppSaves}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Laukaukset ohi:</span>
						<span class="stat-value">{ownMissedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Laukaukset blokkiin:</span>
						<span class="stat-value">{ownBlockedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Vastustajan blokatut vedot:</span>
						<span class="stat-value">{ownBlocks}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Vastustajan vedot ohi:</span>
						<span class="stat-value">{oppMissed}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Maalivahdin torjunnat:</span>
						<span class="stat-value">{ownSaves}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Maalivahdin katkot:</span>
						<span class="stat-value">{ownCatches}</span>
					</div>
					<div class="summary-item total">
						<span class="stat-name">Laukaukset yhteensä:</span>
						<span class="stat-value">{totalOwnShotsOnGoal}</span>
					</div>
					<div class="summary-item goalkeeper-total">
						<span class="stat-name">Oma ({currentGameId !== null ? (selectedGoalkeeper || 'ei nimetty') : (goalkeeperName || 'ei nimetty')}) torjunta-%:</span>
						<span class="stat-value">{ownGoalieSavePercentage}%</span>
					</div>
					<div class="summary-item goalkeeper-total">
						<span class="stat-name">Vastustajan torjunta-%:</span>
						<span class="stat-value">{oppGoalieSavePercentage}%</span>
					</div>
				</div>
			</div>

			<!-- Takaisin-painike -->
			<div class="summary-buttons">
				<button class="back-button" onclick={closeSummary}>Takaisin</button>
			</div>
		</div>
	</div>
{/if}

<!-- Kentälliset-modaali -->
{#if showFieldPositionsModal}
	{console.log('Modaali näytetään, showFieldPositionsModal:', showFieldPositionsModal)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={() => showFieldPositionsModal = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="field-modal" onclick={(e) => e.stopPropagation()}>
			<div class="field-layout">
				<div class="field-section goalkeeper-section">
					<h4>Maalivahti</h4>
					<div class="field-slot-container">
						<button class="field-slot-button goalkeeper-button" onclick={() => openPlayerSelector(0)}>
							{#if fieldPositions[0]}
								{@const player = players.find(p => p.id === fieldPositions[0])}
								{player?.nick || `${player?.first_name} ${player?.last_name}`}
							{:else}
								Valitse
							{/if}
						</button>
						{#if currentFieldSlot === 0}
							<select 
								class="player-dropdown-select"
								onchange={(e) => {
									const playerId = parseInt(e.currentTarget.value);
									if (playerId) {
										assignPlayerToPosition(playerId, 0);
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
				</div>
				
				<div class="field-section">
					<h4>1. Kenttä</h4>
					<div class="field-row">
						{#each [1, 2, 3] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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
					<div class="field-row defenders">
						{#each [4, 5] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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

				<div class="field-section">
					<h4>2. Kenttä</h4>
					<div class="field-row">
						{#each [6, 7, 8] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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
					<div class="field-row defenders">
						{#each [9, 10] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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

				<div class="field-section">
					<h4>3. Kenttä</h4>
					<div class="field-row">
						{#each [11, 12, 13] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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
					<div class="field-row defenders">
						{#each [14, 15] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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

				<div class="field-section">
					<h4>4. Kenttä</h4>
					<div class="field-row">
						{#each [16, 17, 18] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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
					<div class="field-row defenders">
						{#each [19, 20] as position}
							<div class="field-slot-container">
								<button class="field-slot-button" onclick={() => openPlayerSelector(position)}>
									{#if fieldPositions[position]}
										{@const player = players.find(p => p.id === fieldPositions[position])}
										{player?.nick || `${player?.first_name} ${player?.last_name}`}
									{:else}
										Valitse
									{/if}
								</button>
								{#if currentFieldSlot === position}
									<select 
										class="player-dropdown-select"
										onchange={(e) => {
											const playerId = parseInt(e.currentTarget.value);
											if (playerId) {
												assignPlayerToPosition(playerId, position);
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
				<button class="btn-cancel" onclick={async () => {
					await saveFieldPositions();
					showFieldPositionsModal = false;
				}}>Sulje</button>
			</div>
		</div>
	</div>
{/if}

<!-- Maalin kirjaus -modal -->
{#if showGoalModal}
	<div class="modal-overlay">
		<div class="modal-content goal-modal" onclick={(e) => e.stopPropagation()}>
			<h2>{isOpponentGoal ? 'Maali vastustajalle' : (modalStep === 'players' ? 'Kirjaa maali' : 'Maalintekijä ja Syöttäjä')}</h2>
			
			<!-- Maalityypin valinta (vain vaiheessa 1) -->
			{#if modalStep === 'players'}
			<div class="goal-type-section">
				<div class="goal-type-options">
					<label class="goal-type-option">
						<input 
							type="radio" 
							name="goalType" 
							value="NM" 
							checked={goalType === 'NM'}
							onchange={() => goalType = 'NM'}
						/>
						<span>NM</span>
					</label>
					   <label class="goal-type-option">
						   <input 
							   type="radio" 
							   name="goalType" 
							   value="AV"
							   checked={goalType === 'AV'}
							   onchange={() => goalType = 'AV'}
						   />
						   <span>AV</span>
					   </label>
					   <label class="goal-type-option">
						   <input 
							   type="radio" 
							   name="goalType" 
							   value="YV"
							   checked={goalType === 'YV'}
							   onchange={() => goalType = 'YV'}
						   />
						   <span>YV</span>
					   </label>
					<label class="goal-type-option">
						<input 
							type="radio" 
							name="goalType" 
							value="TM"
							checked={goalType === 'TM'}
							onchange={() => goalType = 'TM'}
						/>
						<span>TM</span>
					</label>
					   <label class="goal-type-option">
						   <input 
							   type="radio" 
							   name="goalType" 
							   value="RL"
							   checked={goalType === 'RL'}
							   onchange={() => goalType = 'RL'}
						   />
						   <span>RL</span>
					   </label>
				</div>
			</div>
			{/if}
			
			<!-- Kentälliset näkymä (vain vaiheessa 1 tai oman maalin vaiheessa 2) -->
			{#if modalStep === 'players' || !isOpponentGoal}
			<div class="field-positions-display">
				<h3>Kentällä</h3>
				
			<!-- Maalivahti -->
			<div class="goalkeeper-section">
				<div 
					class="player-slot" class:disabled={fieldPositions[0] === null} 
					class:selected={modalStep === 'players' && fieldPositions[0] !== null && selectedPlayers.includes(fieldPositions[0]!)}
					class:scorer={modalStep === 'scorer' && fieldPositions[0] !== null && goalScorer === fieldPositions[0]}
					class:assist={modalStep === 'scorer' && fieldPositions[0] !== null && goalAssist === fieldPositions[0]}
					onclick={() => fieldPositions[0] !== null && togglePlayerSelection(fieldPositions[0]!)}
				>
					{#if fieldPositions[0]}
						{@const player = players.find(p => p.id === fieldPositions[0])}
						{#if player}
							<span class="player-number">{player.number}</span>
							<span class="player-name">{player.nick || player.first_name}</span>
						{/if}
					{:else}
						<span class="empty-slot">Ei pelaajaa</span>
					{/if}
				</div>
			</div>				<!-- Kentät 1-4 -->
				{#each Array(4) as _, fieldIndex}
					<div class="field-section">
						<h4>Kenttä {fieldIndex + 1}</h4>
						<div class="field-players">
							<!-- Ylärivipelaajat (3 pelaajaa) -->
							<div class="field-row">
								{#each Array(3) as _, playerIndex}
									{@const slotIndex = 1 + fieldIndex * 5 + playerIndex}
									<div class="player-slot small" class:disabled={fieldPositions[slotIndex] === null} class:selected={modalStep === 'players' && fieldPositions[slotIndex] !== null && selectedPlayers.includes(fieldPositions[slotIndex]!)} class:scorer={modalStep === 'scorer' && fieldPositions[slotIndex] !== null && goalScorer === fieldPositions[slotIndex]} class:assist={modalStep === 'scorer' && fieldPositions[slotIndex] !== null && goalAssist === fieldPositions[slotIndex]} onclick={() => fieldPositions[slotIndex] && togglePlayerSelection(fieldPositions[slotIndex]!)}>
										{#if fieldPositions[slotIndex]}
											{@const player = players.find(p => p.id === fieldPositions[slotIndex])}
											{#if player}
												<span class="player-number">{player.number}</span>
												<span class="player-name">{player.nick || player.first_name}</span>
											{/if}
										{:else}
											<span class="empty-slot">-</span>
										{/if}
									</div>
								{/each}
							</div>
							<!-- Alarivipelaajat (2 pelaajaa) -->
							<div class="field-row">
								{#each Array(2) as _, playerIndex}
									{@const slotIndex = 4 + fieldIndex * 5 + playerIndex}
								<div 
									class="player-slot small" class:disabled={fieldPositions[slotIndex] === null} 
									class:selected={modalStep === 'players' && fieldPositions[slotIndex] !== null && selectedPlayers.includes(fieldPositions[slotIndex]!)}
									class:scorer={modalStep === 'scorer' && fieldPositions[slotIndex] !== null && goalScorer === fieldPositions[slotIndex]}
									class:assist={modalStep === 'scorer' && fieldPositions[slotIndex] !== null && goalAssist === fieldPositions[slotIndex]}
									onclick={() => fieldPositions[slotIndex] && togglePlayerSelection(fieldPositions[slotIndex]!)}
								>
									{#if fieldPositions[slotIndex]}
										{@const player = players.find(p => p.id === fieldPositions[slotIndex])}
										{#if player}
											<span class="player-number">{player.number}</span>
											<span class="player-name">{player.nick || player.first_name}</span>
										{/if}
									{:else}
										<span class="empty-slot">-</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/each}
			</div>
			{/if}
			
			<div class="modal-footer">
				<button class="btn-cancel" onclick={closeGoalModal}>Peruuta</button>
				<button class="btn-ok" onclick={confirmGoal}>OK</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background-color: #f0f0f0;
		touch-action: manipulation; /* Estää zoomaus kaksoisnapautuksella */
	}

	.container {
		max-width: 750px;
		margin: 0 auto;
		padding: 20px;
		padding-top: 80px;
		min-height: 100vh;
		background-color: #f0f0f0;
		touch-action: manipulation;
	}

	/* Hampurilaisvalikko */
	.hamburger-menu {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 1000;
	}

	.hamburger-button {
		background-color: #4a90e2;
		border: none;
		border-radius: 8px;
		padding: 12px;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: background-color 0.2s;
	}

	.hamburger-button:hover {
		background-color: #357abd;
	}

	.hamburger-icon {
		width: 24px;
		height: 18px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.hamburger-icon span {
		display: block;
		height: 3px;
		background-color: white;
		border-radius: 2px;
	}

	.menu-dropdown {
		position: absolute;
		top: 60px;
		right: 0;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 200px;
		overflow: hidden;
	}

	.menu-header {
		padding: 14px 20px;
		background-color: #f8f9fa;
		border-bottom: 1px solid #dee2e6;
	}

	.menu-header strong {
		display: block;
		color: #212529;
		margin-bottom: 4px;
	}

	.role-badge {
		display: inline-block;
		padding: 2px 8px;
		background-color: #4a90e2;
		color: white;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.menu-item {
		display: block;
		width: 100%;
		padding: 14px 20px;
		border: none;
		background: none;
		text-align: left;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
		color: #333;
		text-decoration: none;
	}

	.menu-item:hover {
		background-color: #f5f5f5;
	}

	/* Kirjautumis-modal */
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
		background: white;
		padding: 40px;
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 400px;
		position: relative;
	}

	.modal-close {
		position: absolute;
		top: 15px;
		right: 15px;
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

	.modal-content h2 {
		margin-top: 0;
		margin-bottom: 25px;
		text-align: center;
		font-size: 1.8rem;
		color: #1a1a1a;
	}

	.modal-description {
		text-align: center;
		color: #666;
		margin-bottom: 20px;
		line-height: 1.5;
	}

	.forgot-password-link {
		text-align: center;
		margin-top: 15px;
		padding-top: 15px;
		border-top: 1px solid #dee2e6;
	}

	.link-button {
		background: none;
		border: none;
		color: #4a90e2;
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: none;
		padding: 0;
	}

	.link-button:hover {
		text-decoration: underline;
	}

	.success-message {
		background-color: #d4edda;
		color: #155724;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		text-align: center;
		font-size: 0.9rem;
	}

	.error-message {
		background-color: #fee;
		color: #c33;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		text-align: center;
		font-size: 0.9rem;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #333;
	}

	.form-group input {
		width: 100%;
		padding: 12px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.form-group input:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}

	.modal-buttons {
		display: flex;
		gap: 12px;
		margin-top: 25px;
	}

	.btn-login,
	.btn-register {
		flex: 1;
		padding: 14px;
		border: none;
		border-radius: 6px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-login {
		background-color: #4a90e2;
		color: white;
	}

	.btn-login:hover:not(:disabled) {
		background-color: #357abd;
	}

	.btn-login:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	.btn-register {
		background-color: #6cb86c;
		color: white;
	}

	.btn-register:hover {
		background-color: #5ca85c;
	}

	.btn-cancel {
		flex: 1;
		padding: 14px;
		border: none;
		border-radius: 6px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		background-color: #dc3545;
		color: white;
	}

	.btn-cancel:hover {
		background-color: #c82333;
	}

	header {
		text-align: center;
		margin-bottom: 40px;
	}

	.score-display {
		text-align: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 15px 20px;
		margin: 0 -20px 20px -20px;
		border-radius: 0;
	}

	.score-display .score {
		font-size: 2.5rem;
		font-weight: bold;
		color: white;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
		letter-spacing: 0.1em;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0 0 20px 0;
		color: #1a1a1a;
	}

	.save-section {
		margin-top: 30px;
		padding: 20px;
		background-color: #f8f9fa;
		border-radius: 8px;
	}

	.opponent-input {
		margin-bottom: 20px;
	}

	.opponent-input label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #495057;
	}

	.opponent-input input {
		width: 100%;
		padding: 12px;
		border: 2px solid #dee2e6;
		border-radius: 6px;
		font-size: 1rem;
	}

	.opponent-input input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.save-message {
		background-color: #d4edda;
		color: #155724;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 20px;
		text-align: center;
		font-weight: 600;
	}

	.summary-buttons {
		display: flex;
		gap: 15px;
		justify-content: center;
		flex-wrap: wrap;
		position: sticky;
		bottom: 0;
		background-color: white;
		padding: 15px;
		margin: 0 -20px -20px -20px;
		box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
	}

	.save-button {
		background-color: #28a745;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 15px 40px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-button:hover:not(:disabled) {
		background-color: #218838;
	}

	.save-button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	header {
		text-align: center;
		margin-bottom: 30px;
	}

	h1 {
		font-size: 2rem;
		font-weight: bold;
		margin: 0 0 20px 0;
		color: #000;
	}

	.periods {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 15px;
		flex-wrap: wrap;
		margin-bottom: 20px;
	}

	.period-label {
		font-size: 1rem;
		font-weight: 500;
		color: #000;
	}

	.checkbox-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}

	.checkbox-container input[type="checkbox"] {
		width: 30px;
		height: 30px;
		cursor: pointer;
		accent-color: #5b9bd5;
	}

	.checkbox-label {
		font-size: 1.1rem;
		font-weight: 600;
		color: #000;
	}

	.game-info {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 30px;
		max-width: 600px;
		margin: 0 auto 25px auto;
	}

	.game-info .form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.game-info label {
		font-size: 1rem;
		color: #000;
		font-weight: 600;
	}

	/* Pelin tiedot tekstinä */
	.game-info-display {
		display: flex;
		flex-direction: column;
		gap: 15px;
		margin: 0 auto 25px auto;
		padding: 20px 25px;
		background-color: #f8f9fa;
		border-radius: 8px;
		max-width: 600px;
	}

	.info-item {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.info-label {
		font-size: 1rem;
		color: #666;
		font-weight: 600;
		min-width: 100px;
	}

	.info-value {
		font-size: 1.1rem;
		color: #000;
		font-weight: 700;
	}

	.game-info select,
	.game-info input {
		width: 100%;
		padding: 10px;
		border: 2px solid #000;
		border-radius: 4px;
		font-size: 0.95rem;
		background-color: white;
	}

	.game-info select {
		position: relative;
	}

	.stats-section {
		margin-bottom: 20px;
	}

	.stats-section h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 6px;
		margin-top: 5px;
		color: #000;
		text-align: left;
	}

	.stats-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-bottom: 12px;
	}

	.stats-row:has(> :only-child) {
		grid-template-columns: 1fr;
	}

	.stats-row.two-cols {
		grid-template-columns: repeat(2, 1fr);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.stat-label {
		font-size: 1.05rem;
		font-weight: 500;
		color: #000;
		text-align: center;
	}

	.stat-button {
		border: none;
		border-radius: 8px;
		padding: 25px 15px;
		font-size: 2.5rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		min-height: 90px;
		color: #000;
		box-shadow: 0 2px 4px rgba(0,0,0,0.2);
		touch-action: manipulation; /* Estää zoomaus nappia painettaessa */
	}

	.stat-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.3);
	}

	.stat-button:active {
		transform: translateY(0);
		box-shadow: 0 1px 2px rgba(0,0,0,0.2);
	}

	.stat-button.green {
		background-color: #5cb85c;
	}

	.stat-button.green:hover {
		background-color: #4cae4c;
	}

	.stat-button.orange {
		background-color: #f0ad4e;
	}

	.stat-button.orange:hover {
		background-color: #ec971f;
	}

	.stat-button.yellow {
		background-color: #ffd966;
	}

	.stat-button.yellow:hover {
		background-color: #f4c430;
	}

	.action-buttons {
		display: flex;
		flex-direction: row;
		gap: 15px;
		margin-top: 30px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.undo-button {
		background-color: #f4b084;
		color: #000;
		border: none;
		border-radius: 8px;
		padding: 14px 50px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 150px;
	}

	.undo-button:disabled {
		background-color: #ddd;
		color: #888;
		cursor: not-allowed;
	}

	.undo-button:hover:not(:disabled) {
		background-color: #e69b6f;
	}

	.summary-button {
		background-color: #5b9bd5;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 14px 50px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 150px;
	}

	.summary-button:hover {
		background-color: #4a8bc2;
	}

	.reset-button {
		background-color: #dc3545;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 14px 50px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 150px;
	}

	.reset-button:hover {
		background-color: #c82333;
	}

	.summary-view {
		padding: 20px 20px 80px 20px;
	}

	.period-summary {
		background-color: #f8f9fa;
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 30px;
		border: 2px solid #dee2e6;
	}

	.period-summary h2 {
		color: #4a90e2;
		margin-bottom: 15px;
		text-align: center;
	}

	.period-score {
		text-align: center;
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 20px;
		padding: 10px;
		background-color: white;
		border-radius: 8px;
	}

	.score-label {
		color: #6c757d;
		margin-right: 10px;
	}

	.score-display {
		color: #212529;
		font-size: 1.8rem;
	}

	.teams-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.team-column {
		background-color: white;
		padding: 15px;
		border-radius: 8px;
	}

	.team-column h3 {
		font-size: 1.2rem;
		margin-bottom: 15px;
		color: #495057;
		border-bottom: 2px solid #dee2e6;
		padding-bottom: 8px;
	}

	.period-stats {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 6px 0;
		font-size: 0.95rem;
	}

	.stat-row span:first-child {
		color: #6c757d;
	}

	.stat-row span:last-child {
		font-weight: 600;
		color: #212529;
	}

	.stat-row.goalkeeper {
		background-color: #fff3cd;
		padding: 10px 8px;
		margin-top: 10px;
		border-radius: 6px;
		border-left: 4px solid #ffc107;
		font-weight: bold;
	}

	.stat-row.goalkeeper span:first-child {
		color: #856404;
	}

	.stat-row.goalkeeper span:last-child {
		color: #856404;
		font-size: 1.1rem;
	}

	.game-summary {
		background-color: #e7f3ff;
		border-radius: 12px;
		padding: 30px;
		margin-bottom: 30px;
		text-align: center;
		border: 3px solid #4a90e2;
	}

	.game-summary h2 {
		color: #2868a8;
		margin-bottom: 20px;
	}

	.final-score {
		text-align: center;
		margin-bottom: 30px;
	}

	.final-score h2 {
		color: #2868a8;
		margin-bottom: 15px;
	}

	.score-big {
		font-size: 3rem;
		font-weight: bold;
		color: #4a90e2;
		padding: 20px;
		background-color: white;
		border-radius: 12px;
		display: inline-block;
		min-width: 200px;
	}

	.summary-section {
		margin-bottom: 40px;
	}

	.summary-stats {
		background-color: #f8f9fa;
		border-radius: 8px;
		padding: 20px;
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid #dee2e6;
		font-size: 1.1rem;
	}

	.summary-item:last-child {
		border-bottom: none;
	}

	.summary-item.total {
		font-weight: bold;
		font-size: 1.2rem;
		color: #4a90e2;
		margin-top: 10px;
		padding-top: 20px;
		border-top: 2px solid #4a90e2;
	}

	.summary-item.goalkeeper-total {
		background-color: #fff3cd;
		padding: 15px;
		border-radius: 8px;
		margin-top: 15px;
		border-left: 4px solid #ffc107;
	}

	.summary-item.goalkeeper-total .stat-name {
		color: #856404;
		font-weight: bold;
	}

	.summary-item.goalkeeper-total .stat-value {
		color: #856404;
		font-size: 1.5rem;
	}

	.stat-name {
		color: #495057;
	}

	.stat-value {
		font-weight: bold;
		color: #212529;
		font-size: 1.3rem;
	}

	.summary-comparison {
		display: none;
	}

	.score {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		flex-wrap: wrap;
	}

	.score-team {
		font-size: 1.2rem;
		font-weight: 600;
		color: #495057;
	}

	.score-value {
		font-size: 3rem;
		font-weight: bold;
		color: #212529;
	}

	.back-button {
		background-color: #6c757d;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 15px 60px;
		font-size: 1.5rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
		min-width: 250px;
		display: block;
		margin: 0 auto;
	}

	.back-button:hover {
		background-color: #5a6268;
	}

	.back-button:active {
		transform: scale(0.98);
	}

	@media (max-width: 768px) {
		.container {
			padding: 15px;
			padding-top: 70px;
		}

		h1 {
			font-size: 1.6rem;
		}

		.score-display {
			margin: 0 -15px 15px -15px;
			padding: 12px 15px;
		}

		.score-display .score {
			font-size: 2rem;
		}

		.game-info {
			grid-template-columns: 1fr 1fr;
		}

		.game-info .form-group {
			flex-direction: column;
			align-items: stretch;
		}

		.stats-row {
			grid-template-columns: repeat(3, 1fr);
		}

		.stats-row.two-cols {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-button {
			padding: 18px 8px;
			font-size: 1.8rem;
			min-height: 70px;
		}

		.stat-label {
			font-size: 0.95rem;
		}

		.stat-item {
			gap: 5px;
		}

		.stats-section h2 {
			margin-bottom: 5px;
		}

		.stats-section {
			margin-bottom: 15px;
		}

		.action-buttons {
			flex-direction: row;
			gap: 10px;
		}

		.undo-button,
		.summary-button,
		.reset-button {
			flex: 1;
			min-width: auto;
		}
	}

	@media (max-width: 480px) {
		.container {
			padding: 8px;
			padding-top: 60px;
		}

		h1 {
			font-size: 1.2rem;
			margin-bottom: 8px;
		}

		.score-display {
			margin: 0 -8px 8px -8px;
			padding: 8px;
		}

		.score-display .score {
			font-size: 1.6rem;
		}

		.periods {
			gap: 6px;
			margin-bottom: 6px;
		}

		.period-label {
			font-size: 0.8rem;
			margin-bottom: 3px;
		}

		.checkbox-container input[type="checkbox"] {
			width: 18px;
			height: 18px;
		}

		.checkbox-label {
			font-size: 0.8rem;
		}

		.game-info {
			gap: 20px;
			margin-bottom: 8px;
		}

		.game-info label {
			font-size: 0.75rem;
			margin-bottom: 2px;
		}

		.game-info select,
		.game-info input {
			padding: 4px;
			font-size: 0.75rem;
		}

		.stats-section h2 {
			font-size: 0.85rem;
			margin-bottom: 3px;
			margin-top: 3px;
		}

		.stats-section {
			margin-bottom: 8px;
		}

		.stats-row {
			grid-template-columns: repeat(3, 1fr);
			gap: 6px;
			margin-bottom: 6px;
		}

		.stats-row.two-cols {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-item {
			gap: 3px;
		}

		.stat-label {
			font-size: 0.7rem;
			line-height: 1.1;
		}

		.stat-button {
			font-size: 1.3rem;
			padding: 10px 4px;
			min-height: 50px;
		}

		.action-buttons {
			margin-top: 15px;
			flex-direction: row;
			gap: 6px;
		}

		.undo-button,
		.summary-button,
		.reset-button {
			font-size: 0.8rem;
			padding: 10px 12px;
			min-width: auto;
			flex: 1;
		}

		/* Yhteenveto mobiili */
		.modal-overlay {
			padding: 0;
		}

		.summary-view {
			padding: 15px 15px 80px 15px;
			width: 100%;
			max-width: 100%;
			height: 100vh;
			overflow-y: auto;
			border-radius: 0;
			margin: 0;
		}

		.final-score {
			margin-bottom: 20px;
		}

		.final-score h2 {
			font-size: 1.2rem;
			margin-bottom: 10px;
		}

		.score-big {
			font-size: 2rem;
			padding: 12px;
			min-width: 150px;
		}

		.game-summary {
			padding: 15px;
			margin-bottom: 15px;
		}

		.game-summary h2 {
			font-size: 1rem;
			margin-bottom: 12px;
		}

		.summary-stats {
			padding: 12px;
		}

		.summary-item {
			padding: 8px 0;
			font-size: 0.85rem;
			flex-wrap: wrap;
		}

		.stat-name {
			font-size: 0.85rem;
		}

		.stat-value {
			font-size: 1rem;
		}

		.summary-item.total {
			font-size: 0.95rem;
			padding-top: 12px;
		}

		.summary-item.goalkeeper-total {
			padding: 10px;
			margin-top: 10px;
			flex-direction: column;
			gap: 5px;
			text-align: center;
		}

		.summary-item.goalkeeper-total .stat-value {
			font-size: 1.2rem;
		}

		.summary-buttons {
			padding: 12px 15px;
			margin: 0 -15px -15px -15px;
			position: sticky;
			bottom: 0;
		}

		.back-button {
			font-size: 0.9rem;
			padding: 12px;
			width: 100%;
		}
	}

	/* Kentälliset-nappi */
	.field-positions-btn {
		width: 100%;
		padding: 15px;
		background-color: #4CAF50;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-bottom: 20px;
	}

	.field-positions-btn:hover {
		background-color: #45a049;
	}

	/* Kentälliset-modaali */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

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

	/* Maalivahti-osio */
	.goalkeeper-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 15px;
	}

	.goalkeeper-button {
		width: 100%;
		max-width: 500px;
	}

	/* Pelaaja-slot container */
	.field-slot-container {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 180px;
		flex: 1;
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

	/* Puolustajien rivi - isommat napit */
	.field-row.defenders {
		gap: 20px;
	}

	.field-row.defenders .field-slot-button {
		min-width: 240px;
		flex: 1;
		max-width: 280px;
	}

	.modal-footer {
		padding: 25px;
		border-top: none;
		display: flex;
		gap: 20px;
		justify-content: center;
		background-color: white;
	}

	.btn-cancel {
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

	.btn-cancel:hover {
		background-color: #5a6268;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	@media (max-width: 768px) {
		.modal-overlay {
			padding: 0;
			align-items: center;
			justify-content: center;
		}

		.field-modal {
			width: 95%;
			max-width: 95%;
			max-height: 95vh;
			border-radius: 16px;
			margin: auto;
		}

		.field-layout {
			padding: 15px 10px;
			gap: 10px;
		}

		.field-section {
			max-width: 100%;
		}

		.field-section h4 {
			font-size: 1rem;
			margin-bottom: 10px;
		}

		.goalkeeper-section {
			gap: 10px;
		}

		.goalkeeper-button {
			width: 100%;
			max-width: 100%;
			padding: 12px;
			font-size: 0.9rem;
		}

		.field-row {
			gap: 8px;
			margin-bottom: 8px;
		}

		.field-row.defenders {
			gap: 12px;
		}

		.field-slot-container {
			min-width: 0;
			flex: 1;
		}

		.field-slot-button {
			padding: 10px 6px;
			font-size: 0.75rem;
			min-height: 40px;
			min-width: 90px;
			max-width: 110px;
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.field-row.defenders .field-slot-button {
			flex: 1;
			min-width: 120px;
			max-width: none;
			padding: 12px 8px;
			font-size: 0.85rem;
		}

		.player-dropdown-select {
			padding: 8px 6px;
			font-size: 0.75rem;
		}

		.modal-footer {
			padding: 12px 10px;
			gap: 10px;
		}

		.btn-cancel {
			padding: 12px 20px;
			font-size: 0.95rem;
			min-width: 0;
			flex: 1;
		}
	}

	/* Maalin kirjaus modal */
	.goal-modal {
		max-width: 800px;
		max-height: 90vh;
		overflow-y: auto;
		background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
		padding: 30px;
	}

	.goal-modal h2 {
		color: #000;
		font-weight: 700;
		font-size: 2rem;
	}

	.field-positions-display {
		margin-bottom: 30px;
	}

	.field-positions-display h3 {
		margin: 0 0 10px 0;
		font-size: 1.2rem;
		color: #000;
		font-weight: 700;
	}

	.field-positions-display .goalkeeper-section,
	.field-positions-display .field-section {
		margin-bottom: 12px;
	}

	.field-positions-display .field-section h4 {
		font-size: 1.1rem;
		margin-bottom: 8px;
		color: #000;
		font-weight: 700;
	}

	.field-positions-display .field-players {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-positions-display .field-row {
		display: flex;
		gap: 6px;
		justify-content: center;
	}

	.player-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px 8px;
		background-color: #5b9bd5;
		border-radius: 8px;
		min-width: 120px;
		gap: 3px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.player-slot:hover {
		background-color: #4a8ac5;
	}

	.player-slot.selected {
		background-color: #2e7d32;
		box-shadow: 0 0 0 3px #4caf50;
	}

	.player-slot.scorer {
		background-color: #2e7d32;
		box-shadow: 0 0 0 3px #4caf50;
	}

	.player-slot.assist {
		background-color: #f9a825;
		box-shadow: 0 0 0 3px #fdd835;
	}

	.player-slot.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.player-slot.disabled:hover {
		background-color: #5b9bd5;
	}

	.player-slot.small {
		min-width: 100px;
		padding: 8px 6px;
	}

	.player-number {
		font-weight: 700;
		font-size: 1.2rem;
		color: #000;
	}

	.player-slot.small .player-number {
		font-size: 1rem;
	}

	.player-name {
		font-size: 1rem;
		color: #000;
		text-align: center;
		font-weight: 500;
	}

	.player-slot.small .player-name {
		font-size: 0.75rem;
	}

	.empty-slot {
		color: #666;
		font-style: normal;
	}

	.goal-type-section {
		margin-bottom: 15px;
	}

	.goal-type-options {
		display: flex;
		flex-direction: row;
		gap: 8px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.goal-type-option {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 10px;
		background-color: white;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.goal-type-option:hover {
		background-color: #f8f9fa;
	}

	.goal-type-option input[type="radio"] {
		width: 20px;
		height: 20px;
		cursor: pointer;
	}

	.goal-type-option span {
		font-size: 1rem;
		color: #000;
		font-weight: 500;
	}

	.btn-ok {
		flex: 1;
		padding: 15px 50px;
		background-color: #5b9bd5;
		color: #000;
		border: none;
		border-radius: 10px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 160px;
	}

	.btn-ok:hover {
		background-color: #4a8cc4;
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
	}

	.goal-modal .modal-footer {
		display: flex;
		gap: 20px;
		justify-content: center;
		padding: 25px 0 0 0;
		border-top: none;
	}

	@media (max-width: 768px) {
		.goal-modal {
			max-width: 95%;
		}

		.player-slot {
			min-width: 100px;
		}

		.player-slot.small {
			min-width: 80px;
		}
	}
</style>







