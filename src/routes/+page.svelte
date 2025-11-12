<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let selectedPeriod = $state(1);
	let opponentTeamName = $state('');
	let selectedGoalkeeper = $state('');
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

	// Eräkohtaiset tilastot
	type PeriodStats = {
		ownGoals: number;
		ownBlockedShots: number;
		ownMissedShots: number;
		ownBlocks: number;
		ownSaves: number;
		ownCatches: number;
		oppGoals: number;
		oppSaves: number;
		oppMissed: number;
		oppBlocks: number;
	};

	// Päivitä state kun data muuttuu
	$effect(() => {
		isLoggedIn = data.isLoggedIn;
		currentUser = data.user;
		userRole = data.user?.role || '';
		
		// Hae maalivahdit kun komponentti latautuu
		fetchGoalkeepers();
	});

	async function fetchGoalkeepers() {
		try {
			const response = await fetch('/api/admin/players');
			if (response.ok) {
				const players = await response.json();
				goalkeepers = players.filter((p: any) => p.position === 'Maalivahti');
			}
		} catch (error) {
			console.error('Virhe maalivahtien haussa:', error);
		}
	}

	let periodStats: Record<number, PeriodStats> = $state({
		1: {
			ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownBlocks: 0, ownSaves: 0, ownCatches: 0,
			oppGoals: 0, oppSaves: 0, oppMissed: 0, oppBlocks: 0
		},
		2: {
			ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownBlocks: 0, ownSaves: 0, ownCatches: 0,
			oppGoals: 0, oppSaves: 0, oppMissed: 0, oppBlocks: 0
		},
		3: {
			ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownBlocks: 0, ownSaves: 0, ownCatches: 0,
			oppGoals: 0, oppSaves: 0, oppMissed: 0, oppBlocks: 0
		}
	});

	// Nykyisen erän tilastot (computed)
	let currentStats = $derived(periodStats[selectedPeriod]);

	// Koko pelin yhteenlasketut tilastot
	let totalOwnGoals = $derived(periodStats[1].ownGoals + periodStats[2].ownGoals + periodStats[3].ownGoals);
	let totalOwnBlockedShots = $derived(periodStats[1].ownBlockedShots + periodStats[2].ownBlockedShots + periodStats[3].ownBlockedShots);
	let totalOwnMissedShots = $derived(periodStats[1].ownMissedShots + periodStats[2].ownMissedShots + periodStats[3].ownMissedShots);
	let totalOwnBlocks = $derived(periodStats[1].ownBlocks + periodStats[2].ownBlocks + periodStats[3].ownBlocks);
	let totalOwnSaves = $derived(periodStats[1].ownSaves + periodStats[2].ownSaves + periodStats[3].ownSaves);
	let totalOwnCatches = $derived(periodStats[1].ownCatches + periodStats[2].ownCatches + periodStats[3].ownCatches);

	let totalOppGoals = $derived(periodStats[1].oppGoals + periodStats[2].oppGoals + periodStats[3].oppGoals);
	let totalOppSaves = $derived(periodStats[1].oppSaves + periodStats[2].oppSaves + periodStats[3].oppSaves);
	let totalOppMissed = $derived(periodStats[1].oppMissed + periodStats[2].oppMissed + periodStats[3].oppMissed);
	let totalOppBlocks = $derived(periodStats[1].oppBlocks + periodStats[2].oppBlocks + periodStats[3].oppBlocks);

	// Lasketaan meidän laukaukset maalia kohti (maalit + vastustajan torjunnat + blokit)
	let totalOwnShotsOnGoal = $derived(totalOwnGoals + totalOppSaves + totalOwnBlockedShots);

	// Vastustajan torjunta-%: (torjunnat / (torjunnat + päästetyt maalit)) * 100
	let oppGoalieSavePercentage = $derived(() => {
		const totalShots = totalOppSaves + totalOwnGoals;
		if (totalShots === 0) return '0.0';
		return ((totalOppSaves / totalShots) * 100).toFixed(1);
	});

	// Oman maalivahdin torjunta-%: (torjunnat / (torjunnat + vastustajan maalit)) * 100
	let ownGoalieSavePercentage = $derived(() => {
		const totalShotsAgainst = totalOwnSaves + totalOppGoals;
		if (totalShotsAgainst === 0) return '0.0';
		return ((totalOwnSaves / totalShotsAgainst) * 100).toFixed(1);
	});

	let history: Array<{
		team: 'own' | 'opp';
		stat: string;
		value: number;
		period: number;
	}> = $state([]);

	function increment(team: 'own' | 'opp', stat: string) {
		let currentValue = 0;
		const period = selectedPeriod;
		
		if (team === 'own') {
			if (stat === 'goals') { 
				currentValue = periodStats[period].ownGoals; 
				periodStats[period].ownGoals++; 
			}
			else if (stat === 'blocked') { 
				currentValue = periodStats[period].ownBlockedShots; 
				periodStats[period].ownBlockedShots++; 
			}
			else if (stat === 'missed') { 
				currentValue = periodStats[period].ownMissedShots; 
				periodStats[period].ownMissedShots++; 
			}
			else if (stat === 'blocks') {
				currentValue = periodStats[period].ownBlocks;
				periodStats[period].ownBlocks++;
			}
			else if (stat === 'saves') {
				currentValue = periodStats[period].ownSaves;
				periodStats[period].ownSaves++;
			}
			else if (stat === 'catches') {
				currentValue = periodStats[period].ownCatches;
				periodStats[period].ownCatches++;
			}
		} else {
			if (stat === 'goals') { 
				currentValue = periodStats[period].oppGoals; 
				periodStats[period].oppGoals++; 
			}
			else if (stat === 'saves') {
				currentValue = periodStats[period].oppSaves;
				periodStats[period].oppSaves++;
			}
			else if (stat === 'missed') {
				currentValue = periodStats[period].oppMissed;
				periodStats[period].oppMissed++;
			}
			else if (stat === 'blocks') {
				currentValue = periodStats[period].oppBlocks;
				periodStats[period].oppBlocks++;
			}
		}

		history = [...history, { team, stat, value: currentValue, period }];
	}

	function undo() {
		if (history.length === 0) return;

		const last = history.pop();
		if (!last) return;

		const { team, stat, period } = last;

		if (team === 'own') {
			if (stat === 'goals') periodStats[period].ownGoals--;
			else if (stat === 'blocked') periodStats[period].ownBlockedShots--;
			else if (stat === 'missed') periodStats[period].ownMissedShots--;
			else if (stat === 'blocks') periodStats[period].ownBlocks--;
			else if (stat === 'saves') periodStats[period].ownSaves--;
			else if (stat === 'catches') periodStats[period].ownCatches--;
		} else {
			if (stat === 'goals') periodStats[period].oppGoals--;
			else if (stat === 'saves') periodStats[period].oppSaves--;
			else if (stat === 'missed') periodStats[period].oppMissed--;
			else if (stat === 'blocks') periodStats[period].oppBlocks--;
		}
	}

	function resetAllStats() {
		if (confirm('Haluatko varmasti nollata kaikki tilastot?')) {
			periodStats[1] = { ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownBlocks: 0, ownSaves: 0, ownCatches: 0, oppGoals: 0, oppSaves: 0, oppMissed: 0, oppBlocks: 0 };
			periodStats[2] = { ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownBlocks: 0, ownSaves: 0, ownCatches: 0, oppGoals: 0, oppSaves: 0, oppMissed: 0, oppBlocks: 0 };
			periodStats[3] = { ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownBlocks: 0, ownSaves: 0, ownCatches: 0, oppGoals: 0, oppSaves: 0, oppMissed: 0, oppBlocks: 0 };
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

	async function saveGame() {
		if (!opponentTeamName.trim()) {
			saveMessage = 'Anna vastustajan nimi!';
			setTimeout(() => saveMessage = '', 3000);
			return;
		}

		if (!isLoggedIn) {
			saveMessage = 'Kirjaudu sisään tallentaaksesi pelin!';
			showLoginModal = true;
			setTimeout(() => saveMessage = '', 3000);
			return;
		}

		isSaving = true;
		saveMessage = '';

		try {
			const response = await fetch('/api/games/save', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					opponentTeamName: opponentTeamName.trim(),
					periodStats
				})
			});

			const data = await response.json();

			if (response.ok) {
				saveMessage = 'Peli tallennettu!';
				setTimeout(() => saveMessage = '', 3000);
			} else {
				saveMessage = data.error || 'Tallennus epäonnistui';
				setTimeout(() => saveMessage = '', 3000);
			}
		} catch (error) {
			saveMessage = 'Yhteysvirhe. Yritä uudelleen.';
			setTimeout(() => saveMessage = '', 3000);
		} finally {
			isSaving = false;
		}
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
	{#if showSummaryView}
		<div class="summary-view">
			<h1>Yhteenveto - {opponentTeamName || 'Vastustaja'}</h1>
			
			<!-- Lopputulos -->
			<div class="final-score">
				<h2>Lopputulos</h2>
				<div class="score-big">
					{totalOwnGoals} - {totalOppGoals}
				</div>
			</div>

			<!-- Eräkohtaiset tulokset -->
			{#each [1, 2, 3] as period}
				{@const pStats = periodStats[period]}
				{@const hasData = pStats.ownGoals + pStats.ownBlockedShots + pStats.ownMissedShots + 
				                   pStats.oppGoals + pStats.oppSaves > 0}
				{#if hasData}
					<div class="period-summary">
						<h3>Erä {period}</h3>
						<div class="period-score">
							<span class="score-label">Tulos:</span>
							<span class="score-display">{pStats.ownGoals} - {pStats.oppGoals}</span>
						</div>
						
						<div class="period-stats">
							<div class="stat-row">
								<span>Meidän maalit:</span>
								<span>{pStats.ownGoals}</span>
							</div>
							<div class="stat-row">
								<span>Vastustajan maalit:</span>
								<span>{pStats.oppGoals}</span>
							</div>
							<div class="stat-row">
								<span>Vedot maalia kohti:</span>
								<span>{pStats.oppSaves}</span>
							</div>
							<div class="stat-row">
								<span>Vedot ohi:</span>
								<span>{pStats.ownMissedShots}</span>
							</div>
							<div class="stat-row">
								<span>Vedot blokkiin:</span>
								<span>{pStats.ownBlockedShots}</span>
							</div>
							<div class="stat-row">
								<span>BlokkiPisteet:</span>
								<span>{pStats.ownBlocks}</span>
							</div>
							<div class="stat-row">
								<span>Vastustajan vedot ohi:</span>
								<span>{pStats.oppMissed}</span>
							</div>
						</div>
					</div>
				{/if}
			{/each}

			<!-- Koko pelin yhteenveto -->
			<div class="game-summary">
				<h2>Koko peli - Yhteensä</h2>
				
				<div class="summary-stats">
					<div class="summary-item">
						<span class="stat-name">Meidän maalit:</span>
						<span class="stat-value">{totalOwnGoals}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Vastustajan maalit:</span>
						<span class="stat-value">{totalOppGoals}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Laukaukset maalia kohti:</span>
						<span class="stat-value">{totalOppSaves}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Laukaukset ohi:</span>
						<span class="stat-value">{totalOwnMissedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Laukaukset blokkiin:</span>
						<span class="stat-value">{totalOwnBlockedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Vastustajan blokatut vedot:</span>
						<span class="stat-value">{totalOwnBlocks}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Vastustajan vedot ohi:</span>
						<span class="stat-value">{totalOppMissed}</span>
					</div>
					<div class="summary-item total">
						<span class="stat-name">Laukaukset yhteensä:</span>
						<span class="stat-value">{totalOwnShotsOnGoal}</span>
					</div>
					<div class="summary-item goalkeeper-total">
						<span class="stat-name">Oman maalivahdin ({selectedGoalkeeper || 'ei nimetty'}) torjunta-%:</span>
						<span class="stat-value">{ownGoalieSavePercentage()}%</span>
					</div>
					<div class="summary-item goalkeeper-total">
						<span class="stat-name">Vastustajan maalivahdin torjunta-%:</span>
						<span class="stat-value">{oppGoalieSavePercentage()}%</span>
					</div>
				</div>
			</div>

			<!-- Takaisin-painike -->
			<div class="summary-buttons">
				<button class="back-button" onclick={closeSummary}>Takaisin</button>
			</div>
		</div>
	{:else}
		<header>
			<h1>Pelitilastointi</h1>

			<div class="game-info">
				<div class="form-group">
					<label for="goalkeeper">Maalivahti</label>
					<input 
						type="text" 
						id="goalkeeper" 
						bind:value={selectedGoalkeeper}
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
		</header>

		<div class="periods">
			<span class="period-label">Erä:</span>
			<label class="checkbox-container">
				<input type="checkbox" checked={selectedPeriod === 1} onclick={() => selectedPeriod = 1} />
				<span class="checkbox-label">I</span>
			</label>
			<label class="checkbox-container">
				<input type="checkbox" checked={selectedPeriod === 2} onclick={() => selectedPeriod = 2} />
				<span class="checkbox-label">II</span>
			</label>
			<label class="checkbox-container">
				<input type="checkbox" checked={selectedPeriod === 3} onclick={() => selectedPeriod = 3} />
				<span class="checkbox-label">III</span>
			</label>
		</div>

		<!-- Pistetilanne -->
		<div class="score-display">
			<span class="score">{totalOwnGoals} - {totalOppGoals}</span>
		</div>

		<section class="stats-section">
			<div class="stats-row two-cols">
				<div class="stat-item">
					<span class="stat-label">Maali meille</span>
					<button class="stat-button green" onclick={() => increment('own', 'goals')}>
						{currentStats.ownGoals}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Maali vastustajalle</span>
					<button class="stat-button orange" onclick={() => increment('opp', 'goals')}>
						{currentStats.oppGoals}
					</button>
				</div>
			</div>

			<h2>Pelitilanteet:</h2>
			<div class="stats-row">
				<div class="stat-item">
					<span class="stat-label">Veto maalia kohti</span>
					<button class="stat-button green" onclick={() => increment('opp', 'saves')}>
						{currentStats.oppSaves}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Veto ohi</span>
					<button class="stat-button yellow" onclick={() => increment('own', 'missed')}>
						{currentStats.ownMissedShots}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Veto blokkiin</span>
					<button class="stat-button yellow" onclick={() => increment('own', 'blocked')}>
						{currentStats.ownBlockedShots}
					</button>
				</div>
			</div>

			<div class="stats-row two-cols">
				<div class="stat-item">
					<span class="stat-label">BlokkiPisteet</span>
					<button class="stat-button green" onclick={() => increment('own', 'blocks')}>
						{currentStats.ownBlocks || 0}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Vastustajan vedot ohi maalin</span>
					<button class="stat-button green" onclick={() => increment('opp', 'missed')}>
						{currentStats.oppMissed || 0}
					</button>
				</div>
			</div>

			<div class="stats-row two-cols">
				<div class="stat-item">
					<span class="stat-label">Torjunta</span>
					<button class="stat-button green" onclick={() => increment('own', 'saves')}>
						{currentStats.ownSaves || 0}
					</button>
				</div>
				<div class="stat-item">
					<span class="stat-label">Maalivahdin katko</span>
					<button class="stat-button green" onclick={() => increment('own', 'catches')}>
						{currentStats.ownCatches || 0}
					</button>
				</div>
			</div>
		</section>

		<div class="action-buttons">
			<button class="undo-button" onclick={undo} disabled={history.length === 0}>Undo</button>
			<button class="summary-button" onclick={showSummary}>Yhteenveto</button>
			<button class="reset-button" onclick={resetAllStats}>Tyhjennä</button>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background-color: #f0f0f0;
	}

	.container {
		max-width: 750px;
		margin: 0 auto;
		padding: 20px;
		padding-top: 80px;
		min-height: 100vh;
		background-color: #f0f0f0;
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
		padding: 20px 0;
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
			padding: 10px;
			padding-top: 65px;
		}

		h1 {
			font-size: 1.3rem;
			margin-bottom: 10px;
		}

		.score-display {
			margin: 0 -10px 10px -10px;
			padding: 10px;
		}

		.score-display .score {
			font-size: 1.8rem;
		}

		.periods {
			gap: 8px;
			margin-bottom: 8px;
		}

		.period-label {
			font-size: 0.85rem;
			margin-bottom: 4px;
		}

		.checkbox-container input[type="checkbox"] {
			width: 20px;
			height: 20px;
		}

		.checkbox-label {
			font-size: 0.85rem;
		}

		.game-info {
			gap: 30px;
			margin-bottom: 10px;
		}

		.game-info label {
			font-size: 0.8rem;
			margin-bottom: 2px;
		}

		.game-info select,
		.game-info input {
			padding: 5px;
			font-size: 0.8rem;
		}

		.stats-section h2 {
			font-size: 0.9rem;
			margin-bottom: 4px;
			margin-top: 4px;
		}

		.stats-section {
			margin-bottom: 10px;
		}

		.stats-row {
			grid-template-columns: repeat(3, 1fr);
			gap: 8px;
			margin-bottom: 8px;
		}

		.stats-row.two-cols {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-item {
			gap: 4px;
		}

		.stat-label {
			font-size: 0.8rem;
		}

		.stat-button {
			font-size: 1.5rem;
			padding: 12px 5px;
			min-height: 60px;
		}

		.action-buttons {
			margin-top: 20px;
			flex-direction: row;
			gap: 8px;
		}

		.undo-button,
		.summary-button,
		.reset-button {
			font-size: 0.9rem;
			padding: 12px 15px;
			min-width: auto;
			flex: 1;
		}
	}
</style>
