<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	let selectedPeriod = $state(1);
	let opponentTeamName = $state('');
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
		ownDraws: number;
		ownTakeaways: number;
		oppGoals: number;
		oppBlockedShots: number;
		oppMissedShots: number;
		oppDraws: number;
		oppTakeaways: number;
	};

	// Päivitä state kun data muuttuu
	$effect(() => {
		isLoggedIn = data.isLoggedIn;
		currentUser = data.user;
		userRole = data.user?.role || '';
	});

	let periodStats: Record<number, PeriodStats> = $state({
		1: {
			ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownDraws: 0, ownTakeaways: 0,
			oppGoals: 0, oppBlockedShots: 0, oppMissedShots: 0, oppDraws: 0, oppTakeaways: 0
		},
		2: {
			ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownDraws: 0, ownTakeaways: 0,
			oppGoals: 0, oppBlockedShots: 0, oppMissedShots: 0, oppDraws: 0, oppTakeaways: 0
		},
		3: {
			ownGoals: 0, ownBlockedShots: 0, ownMissedShots: 0, ownDraws: 0, ownTakeaways: 0,
			oppGoals: 0, oppBlockedShots: 0, oppMissedShots: 0, oppDraws: 0, oppTakeaways: 0
		}
	});

	// Nykyisen erän tilastot (computed)
	let currentStats = $derived(periodStats[selectedPeriod]);

	// Oma joukkue stats (nykyinen erä)
	let ownGoals = $derived(currentStats.ownGoals);
	let ownBlockedShots = $derived(currentStats.ownBlockedShots);
	let ownMissedShots = $derived(currentStats.ownMissedShots);
	let ownDraws = $derived(currentStats.ownDraws);
	let ownTakeaways = $derived(currentStats.ownTakeaways);

	// Vastustaja stats (nykyinen erä)
	let oppGoals = $derived(currentStats.oppGoals);
	let oppBlockedShots = $derived(currentStats.oppBlockedShots);
	let oppMissedShots = $derived(currentStats.oppMissedShots);
	let oppDraws = $derived(currentStats.oppDraws);
	let oppTakeaways = $derived(currentStats.oppTakeaways);

	// Koko pelin yhteenlasketut tilastot
	let totalOwnGoals = $derived(periodStats[1].ownGoals + periodStats[2].ownGoals + periodStats[3].ownGoals);
	let totalOwnBlockedShots = $derived(periodStats[1].ownBlockedShots + periodStats[2].ownBlockedShots + periodStats[3].ownBlockedShots);
	let totalOwnMissedShots = $derived(periodStats[1].ownMissedShots + periodStats[2].ownMissedShots + periodStats[3].ownMissedShots);
	let totalOwnDraws = $derived(periodStats[1].ownDraws + periodStats[2].ownDraws + periodStats[3].ownDraws);
	let totalOwnTakeaways = $derived(periodStats[1].ownTakeaways + periodStats[2].ownTakeaways + periodStats[3].ownTakeaways);

	let totalOppGoals = $derived(periodStats[1].oppGoals + periodStats[2].oppGoals + periodStats[3].oppGoals);
	let totalOppBlockedShots = $derived(periodStats[1].oppBlockedShots + periodStats[2].oppBlockedShots + periodStats[3].oppBlockedShots);
	let totalOppMissedShots = $derived(periodStats[1].oppMissedShots + periodStats[2].oppMissedShots + periodStats[3].oppMissedShots);
	let totalOppDraws = $derived(periodStats[1].oppDraws + periodStats[2].oppDraws + periodStats[3].oppDraws);
	let totalOppTakeaways = $derived(periodStats[1].oppTakeaways + periodStats[2].oppTakeaways + periodStats[3].oppTakeaways);

	// Torjuntaprosentti laskenta
	function calculateSavePercentage(saves: number, goalsAgainst: number): string {
		const totalShots = saves + goalsAgainst;
		if (totalShots === 0) return '0.0';
		const percentage = (saves / totalShots) * 100;
		return percentage.toFixed(1);
	}

	let history: Array<{
		team: 'own' | 'opp';
		stat: string;
		value: number;
		period: number;
	}> = $state([]);

	let showSummaryView = $state(false);

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
			else if (stat === 'draws') { 
				currentValue = periodStats[period].ownDraws; 
				periodStats[period].ownDraws++; 
			}
			else if (stat === 'takeaways') { 
				currentValue = periodStats[period].ownTakeaways; 
				periodStats[period].ownTakeaways++; 
			}
		} else {
			if (stat === 'goals') { 
				currentValue = periodStats[period].oppGoals; 
				periodStats[period].oppGoals++; 
			}
			else if (stat === 'blocked') { 
				currentValue = periodStats[period].oppBlockedShots; 
				periodStats[period].oppBlockedShots++; 
			}
			else if (stat === 'missed') { 
				currentValue = periodStats[period].oppMissedShots; 
				periodStats[period].oppMissedShots++; 
			}
			else if (stat === 'draws') { 
				currentValue = periodStats[period].oppDraws; 
				periodStats[period].oppDraws++; 
			}
			else if (stat === 'takeaways') { 
				currentValue = periodStats[period].oppTakeaways; 
				periodStats[period].oppTakeaways++; 
			}
		}

		history.push({ team, stat, value: currentValue, period });
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
			else if (stat === 'draws') periodStats[period].ownDraws--;
			else if (stat === 'takeaways') periodStats[period].ownTakeaways--;
		} else {
			if (stat === 'goals') periodStats[period].oppGoals--;
			else if (stat === 'blocked') periodStats[period].oppBlockedShots--;
			else if (stat === 'missed') periodStats[period].oppMissedShots--;
			else if (stat === 'draws') periodStats[period].oppDraws--;
			else if (stat === 'takeaways') periodStats[period].oppTakeaways--;
		}
	}

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

<!-- Hampurilaisvalikko -->
<div class="hamburger-menu">
	<button class="hamburger-button" onclick={toggleMenu} aria-label="Valikko">
		<div class="hamburger-icon">
			<span></span>
			<span></span>
			<span></span>
		</div>
	</button>
	
	{#if showMenu}
		<div class="menu-dropdown">
			{#if isLoggedIn}
				<div class="menu-header">
					<strong>{currentUser?.firstName} {currentUser?.lastName}</strong>
					<span class="role-badge">{userRole}</span>
				</div>
				
				{#if userRole === 'admin'}
					<button class="menu-item" onclick={() => navigateTo('/admin')}>
						Käyttäjähallinta
					</button>
					<button class="menu-item" onclick={() => navigateTo('/admin/teams')}>
						Joukkueet
					</button>
					<button class="menu-item" onclick={() => navigateTo('/admin/stats')}>
						Kaikki tilastot
					</button>
				{/if}
				
				{#if userRole === 'admin' || userRole === 'toimihenkilö'}
					<button class="menu-item" onclick={() => navigateTo('/reports')}>
						Raportit
					</button>
				{/if}
				
				{#if userRole === 'admin' || userRole === 'toimihenkilö' || userRole === 'kirjuri'}
					<button class="menu-item" onclick={() => navigateTo('/games')}>
						Pelit
					</button>
				{/if}
				
				<button class="menu-item" onclick={() => navigateTo('/profile')}>
					Oma profiili
				</button>
				<button class="menu-item" onclick={logout}>Kirjaudu ulos</button>
			{:else}
				<button class="menu-item" onclick={openLoginModal}>Kirjaudu</button>
			{/if}
		</div>
	{/if}
</div>

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
			<h1>Yhteenveto</h1>
			
			<!-- Eräkohtaiset tulokset -->
			{#each [1, 2, 3] as period}
				{@const pStats = periodStats[period]}
				{@const hasData = pStats.ownGoals + pStats.ownBlockedShots + pStats.ownMissedShots + 
				                   pStats.oppGoals + pStats.oppBlockedShots + pStats.oppMissedShots > 0}
				{#if hasData}
					<div class="period-summary">
						<h2>Erä {period}</h2>
						<div class="period-score">
							<span class="score-label">Tulos:</span>
							<span class="score-display">{pStats.ownGoals} - {pStats.oppGoals}</span>
						</div>
						
						<div class="teams-grid">
							<div class="team-column">
								<h3>Oma joukkue</h3>
								<div class="period-stats">
									<div class="stat-row">
										<span>Maalit:</span>
										<span>{pStats.ownGoals}</span>
									</div>
									<div class="stat-row">
										<span>Veto blokkiin:</span>
										<span>{pStats.ownBlockedShots}</span>
									</div>
									<div class="stat-row">
										<span>Veto ohi:</span>
										<span>{pStats.ownMissedShots}</span>
									</div>
									<div class="stat-row">
										<span>Torjunnat:</span>
										<span>{pStats.ownDraws}</span>
									</div>
									<div class="stat-row">
										<span>Moken katko:</span>
										<span>{pStats.ownTakeaways}</span>
									</div>
									<div class="stat-row goalkeeper">
										<span>Torjunta-%:</span>
										<span>{calculateSavePercentage(pStats.ownDraws, pStats.oppGoals)}%</span>
									</div>
								</div>
							</div>
							
							<div class="team-column">
								<h3>Vastustaja</h3>
								<div class="period-stats">
									<div class="stat-row">
										<span>Maalit:</span>
										<span>{pStats.oppGoals}</span>
									</div>
									<div class="stat-row">
										<span>Veto blokkiin:</span>
										<span>{pStats.oppBlockedShots}</span>
									</div>
									<div class="stat-row">
										<span>Veto ohi:</span>
										<span>{pStats.oppMissedShots}</span>
									</div>
									<div class="stat-row">
										<span>Torjunnat:</span>
										<span>{pStats.oppDraws}</span>
									</div>
									<div class="stat-row">
										<span>Moken katko:</span>
										<span>{pStats.oppTakeaways}</span>
									</div>
									<div class="stat-row goalkeeper">
										<span>Torjunta-%:</span>
										<span>{calculateSavePercentage(pStats.oppDraws, pStats.ownGoals)}%</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/each}

			<!-- Koko pelin yhteenveto -->
			<div class="game-summary">
				<h2>Koko peli</h2>
				<div class="final-score">
					<span class="score-team">Oma joukkue</span>
					<span class="score-value">{totalOwnGoals} - {totalOppGoals}</span>
					<span class="score-team">Vastustaja</span>
				</div>
			</div>
			
			<div class="summary-section">
				<h2>Oma joukkue - Yhteensä</h2>
				<div class="summary-stats">
					<div class="summary-item">
						<span class="stat-name">Maalit:</span>
						<span class="stat-value">{totalOwnGoals}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Veto blokkiin:</span>
						<span class="stat-value">{totalOwnBlockedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Veto ohi:</span>
						<span class="stat-value">{totalOwnMissedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Torjunnat:</span>
						<span class="stat-value">{totalOwnDraws}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Moken katko:</span>
						<span class="stat-value">{totalOwnTakeaways}</span>
					</div>
				<div class="summary-item total">
					<span class="stat-name">Laukaukset yhteensä:</span>
					<span class="stat-value">{totalOwnGoals + totalOwnBlockedShots + totalOwnMissedShots}</span>
				</div>
				<div class="summary-item goalkeeper-total">
					<span class="stat-name">Maalivahdin torjunta-%:</span>
					<span class="stat-value">{calculateSavePercentage(totalOwnDraws, totalOppGoals)}%</span>
				</div>
			</div>
		</div>

		<div class="summary-section">
				<h2>Vastustaja - Yhteensä</h2>
				<div class="summary-stats">
					<div class="summary-item">
						<span class="stat-name">Maalit:</span>
						<span class="stat-value">{totalOppGoals}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Veto blokkiin:</span>
						<span class="stat-value">{totalOppBlockedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Veto ohi:</span>
						<span class="stat-value">{totalOppMissedShots}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Torjunnat:</span>
						<span class="stat-value">{totalOppDraws}</span>
					</div>
					<div class="summary-item">
						<span class="stat-name">Moken katko:</span>
						<span class="stat-value">{totalOppTakeaways}</span>
					</div>
				<div class="summary-item total">
					<span class="stat-name">Laukaukset yhteensä:</span>
					<span class="stat-value">{totalOppGoals + totalOppBlockedShots + totalOppMissedShots}</span>
				</div>
				<div class="summary-item goalkeeper-total">
					<span class="stat-name">Maalivahdin torjunta-%:</span>
					<span class="stat-value">{calculateSavePercentage(totalOppDraws, totalOwnGoals)}%</span>
				</div>
			</div>
		</div>

		<!-- Tallennuspainikkeet -->
		<div class="save-section">
			{#if saveMessage}
				<div class="save-message">{saveMessage}</div>
			{/if}
			
			<div class="opponent-input">
				<label for="opponentName">Vastustajan nimi:</label>
				<input 
					type="text" 
					id="opponentName" 
					bind:value={opponentTeamName}
					placeholder="Anna vastustajan nimi"
				/>
			</div>

			<div class="summary-buttons">
				<button class="save-button" onclick={saveGame} disabled={isSaving}>
					{isSaving ? 'Tallennetaan...' : 'Tallenna peli'}
				</button>
				<button class="back-button" onclick={closeSummary}>Takaisin</button>
			</div>
		</div>
		</div>
	{:else}
		<header>
		<h1>Pelitilastointi</h1>
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
	</header>

	<section class="team-section">
		<h2>Oma joukkue</h2>
		<div class="stats-grid">
			<div class="stat-item">
				<label>Maali</label>
				<button class="stat-button" onclick={() => increment('own', 'goals')}>
					{ownGoals}
				</button>
			</div>
			<div class="stat-item">
				<label>Veto blokkiin</label>
				<button class="stat-button" onclick={() => increment('own', 'blocked')}>
					{ownBlockedShots}
				</button>
			</div>
			<div class="stat-item">
				<label>Veto ohi</label>
				<button class="stat-button" onclick={() => increment('own', 'missed')}>
					{ownMissedShots}
				</button>
			</div>
			<div class="stat-item">
				<label>Torjunta</label>
				<button class="stat-button" onclick={() => increment('own', 'draws')}>
					{ownDraws}
				</button>
			</div>
			<div class="stat-item">
				<label>Moken katko</label>
				<button class="stat-button" onclick={() => increment('own', 'takeaways')}>
					{ownTakeaways}
				</button>
			</div>
		</div>
	</section>

	<section class="team-section">
		<h2>Vastustaja</h2>
		<div class="stats-grid">
			<div class="stat-item">
				<label>Maali</label>
				<button class="stat-button" onclick={() => increment('opp', 'goals')}>
					{oppGoals}
				</button>
			</div>
			<div class="stat-item">
				<label>Veto blokkiin</label>
				<button class="stat-button" onclick={() => increment('opp', 'blocked')}>
					{oppBlockedShots}
				</button>
			</div>
			<div class="stat-item">
				<label>Veto ohi</label>
				<button class="stat-button" onclick={() => increment('opp', 'missed')}>
					{oppMissedShots}
				</button>
			</div>
			<div class="stat-item">
				<label>Torjunta</label>
				<button class="stat-button" onclick={() => increment('opp', 'draws')}>
					{oppDraws}
				</button>
			</div>
			<div class="stat-item">
				<label>Moken katko</label>
				<button class="stat-button" onclick={() => increment('opp', 'takeaways')}>
					{oppTakeaways}
				</button>
			</div>
		</div>
	</section>

	<div class="action-buttons">
		<button class="undo-button" onclick={undo}>Undo</button>
		<button class="summary-button" onclick={showSummary}>Yhteenveto</button>
	</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background-color: #f5f5f5;
	}

	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		min-height: 100vh;
		background-color: white;
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
		margin-bottom: 40px;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0 0 20px 0;
		color: #1a1a1a;
	}

	.periods {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}

	.period-label {
		font-size: 1.2rem;
		font-weight: 600;
	}

	.checkbox-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		cursor: pointer;
	}

	.checkbox-container input[type="checkbox"] {
		width: 40px;
		height: 40px;
		cursor: pointer;
		accent-color: #4a90e2;
	}

	.checkbox-label {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.team-section {
		margin-bottom: 30px;
	}

	h2 {
		font-size: 1.8rem;
		font-weight: 600;
		margin-bottom: 15px;
		text-decoration: underline;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 15px;
		margin-bottom: 15px;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.stat-item label {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1a1a1a;
	}

	.stat-button {
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 15px;
		font-size: 2rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
		min-height: 70px;
	}

	.stat-button:hover {
		background-color: #357abd;
	}

	.stat-button:active {
		background-color: #2868a8;
		transform: scale(0.98);
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 15px;
		margin-top: 20px;
		align-items: center;
	}

	.undo-button {
		background-color: #e89f71;
		color: #1a1a1a;
		border: none;
		border-radius: 8px;
		padding: 12px 50px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
		min-width: 250px;
	}

	.undo-button:hover {
		background-color: #d88f61;
	}

	.summary-button {
		background-color: #6cb86c;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 12px 50px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
		min-width: 250px;
	}

	.summary-button:hover {
		background-color: #5ca85c;
	}

	.summary-button:active,
	.undo-button:active {
		transform: scale(0.98);
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
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		flex-wrap: wrap;
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
			padding: 10px;
		}

		h1 {
			font-size: 1.6rem;
			margin-bottom: 10px;
		}

		h2 {
			font-size: 1.3rem;
			margin-bottom: 10px;
		}

		header {
			margin-bottom: 20px;
		}

		.team-section {
			margin-bottom: 20px;
		}

		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 10px;
		}

		.periods {
			gap: 12px;
			margin-bottom: 5px;
		}

		.period-label {
			font-size: 1rem;
		}

		.checkbox-container input[type="checkbox"] {
			width: 30px;
			height: 30px;
		}

		.checkbox-label {
			font-size: 0.9rem;
		}

		.stat-item label {
			font-size: 0.85rem;
		}

		.stat-button {
			font-size: 1.5rem;
			padding: 10px 5px;
			min-height: 55px;
		}

		.action-buttons {
			gap: 10px;
			margin-top: 15px;
		}

		.undo-button,
		.summary-button {
			min-width: 100%;
			padding: 12px 30px;
			font-size: 1.2rem;
		}

		.back-button {
			min-width: 100%;
		}

		.score-value {
			font-size: 2.5rem;
		}

		.summary-stats {
			padding: 15px;
		}

		.teams-grid {
			grid-template-columns: 1fr;
			gap: 15px;
		}

		.period-summary {
			padding: 15px;
		}

		.score-display {
			font-size: 1.5rem;
		}

		.final-score {
			gap: 10px;
		}
	}

	@media (max-width: 480px) {
		h1 {
			font-size: 1.4rem;
		}

		.period-label {
			font-size: 0.9rem;
		}

		.checkbox-label {
			font-size: 0.85rem;
		}

		.stat-item label {
			font-size: 0.8rem;
		}

		.stat-button {
			font-size: 1.3rem;
			padding: 8px 3px;
			min-height: 50px;
		}

		.undo-button,
		.summary-button {
			font-size: 1.1rem;
			padding: 10px 25px;
		}

		.back-button {
			font-size: 1.3rem;
		}

		.stat-name {
			font-size: 0.95rem;
		}

		.stat-value {
			font-size: 1.1rem;
		}

		.score-value {
			font-size: 2rem;
		}

		.score-team {
			font-size: 1rem;
		}

		.teams-grid {
			grid-template-columns: 1fr;
		}

		.team-column h3 {
			font-size: 1.1rem;
		}

		.stat-row {
			font-size: 0.9rem;
		}
	}
</style>
