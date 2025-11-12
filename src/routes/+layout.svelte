<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	
	let showMenu = $state(false);
	let showLoginModal = $state(false);
	let loginUsername = $state('');
	let loginPassword = $state('');
	let loginError = $state('');
	let isLoggingIn = $state(false);
	
	let isLoggedIn = $state(data?.isLoggedIn || false);
	let currentUser = $state(data?.user);
	let userRole = $derived(currentUser?.role || '');

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function navigateTo(path: string) {
		showMenu = false;
		window.location.href = path;
	}

	async function logout() {
		showMenu = false;
		
		try {
			const response = await fetch('/api/auth/logout', { 
				method: 'POST',
				credentials: 'include'
			});
			
			if (response.ok) {
				// Tyhjennä paikallinen tila
				isLoggedIn = false;
				currentUser = null;
				
				// Invalidoi kaikki data ja lataa uudelleen
				await invalidateAll();
				
				// Ohjaa etusivulle
				await goto('/', { replaceState: true, invalidateAll: true });
			} else {
				console.error('Logout failed:', response.status);
				// Yritä silti kirjata ulos pakottamalla reload
				window.location.href = '/';
			}
		} catch (error) {
			console.error('Logout error:', error);
			// Virhetilanteessa pakota reload
			window.location.href = '/';
		}
	}

	function openLoginModal() {
		showMenu = false;
		showLoginModal = true;
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
				closeLoginModal();
				window.location.reload();
			} else {
				loginError = data.error || 'Kirjautuminen epäonnistui';
			}
		} catch (error) {
			loginError = 'Yhteysvirhe. Yritä uudelleen.';
		} finally {
			isLoggingIn = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

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
				
				<button class="menu-item" onclick={() => navigateTo('/')}>
					Etusivu
				</button>
				
				{#if userRole === 'admin'}
					<button class="menu-item" onclick={() => navigateTo('/admin')}>
						Käyttäjähallinta
					</button>
					<button class="menu-item" onclick={() => navigateTo('/admin/series')}>
						Sarjat
					</button>
				{/if}
				
				{#if userRole === 'admin' || userRole === 'junioripäällikkö' || userRole === 'vastuuvalmentaja' || userRole === 'toimihenkilö' || userRole === 'kirjuri'}
					<button class="menu-item" onclick={() => navigateTo('/games')}>
						Pelit
					</button>
				{/if}
				
				{#if userRole === 'admin'}
					<button class="menu-item" onclick={() => navigateTo('/admin/teams')}>
						Joukkueet
					</button>
					<button class="menu-item" onclick={() => navigateTo('/admin/players')}>
						Pelaajat
					</button>
					<button class="menu-item" onclick={() => navigateTo('/games/new')}>
						Luo peli
					</button>
					<button class="menu-item" onclick={() => navigateTo('/admin/stats')}>
						Kaikki tilastot
					</button>
				{/if}
				
				{#if userRole === 'admin' || userRole === 'junioripäällikkö' || userRole === 'vastuuvalmentaja' || userRole === 'toimihenkilö'}
					<button class="menu-item" onclick={() => navigateTo('/reports')}>
						Raportit
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
				</div>
			</form>
		</div>
	</div>
{/if}

{@render children()}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

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
		transition: background-color 0.3s;
	}

	.hamburger-button:hover {
		background-color: #357abd;
	}

	.hamburger-icon {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 24px;
	}

	.hamburger-icon span {
		display: block;
		height: 3px;
		background-color: white;
		border-radius: 2px;
		transition: all 0.3s;
	}

	.menu-dropdown {
		position: absolute;
		top: 60px;
		right: 0;
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 250px;
		overflow: hidden;
	}

	.menu-header {
		padding: 16px 20px;
		background-color: #f8f9fa;
		border-bottom: 1px solid #dee2e6;
	}

	.menu-header strong {
		display: block;
		color: #1a1a1a;
		margin-bottom: 4px;
	}

	.role-badge {
		display: inline-block;
		padding: 4px 12px;
		background-color: #4a90e2;
		color: white;
		border-radius: 12px;
		font-size: 0.85rem;
		font-weight: 600;
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

	/* Modal tyylit */
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
		z-index: 2000;
	}

	.modal-content {
		background-color: white;
		border-radius: 12px;
		padding: 30px;
		max-width: 400px;
		width: 90%;
		position: relative;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
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
		color: #000;
	}

	.modal-content h2 {
		margin-top: 0;
		margin-bottom: 20px;
		color: #1a1a1a;
		text-align: center;
	}

	.error-message {
		background-color: #f8d7da;
		color: #721c24;
		padding: 12px;
		border-radius: 6px;
		margin-bottom: 15px;
		text-align: center;
	}

	.form-group {
		margin-bottom: 15px;
	}

	.form-group label {
		display: block;
		margin-bottom: 5px;
		color: #333;
		font-weight: 500;
	}

	.form-group input {
		width: 100%;
		padding: 10px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	.modal-buttons {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}

	.btn-login {
		flex: 1;
		padding: 12px;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-login:hover:not(:disabled) {
		background-color: #357abd;
	}

	.btn-login:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.hamburger-menu {
			top: 10px;
			right: 10px;
		}

		.menu-dropdown {
			right: -10px;
		}
	}
</style>
