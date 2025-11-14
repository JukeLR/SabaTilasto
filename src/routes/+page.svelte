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

<main>
  <div class="hamburger-menu">
    <!-- Hampurilaisvalikko-komponentti tai nappi tähän -->
  </div>
  <h1 style="text-align:center;margin-top:2rem;">SabaTilastot</h1>
  <div style="text-align:center;margin-top:2rem;">
    <a href="/register" style="font-weight:bold;color:#357ab8;text-decoration:underline;font-size:1.2rem;">Luo uusi käyttäjä</a>
  </div>
</main>

<style>
  .hamburger-menu {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
  }
</style>







