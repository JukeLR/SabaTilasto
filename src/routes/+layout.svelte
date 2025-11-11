<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	
	let showMenu = $state(false);
	let isLoggedIn = $derived(data?.isLoggedIn || false);
	let currentUser = $derived(data?.user);
	let userRole = $derived(data?.user?.role || '');

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function navigateTo(path: string) {
		showMenu = false;
		window.location.href = path;
	}

	async function logout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			showMenu = false;
			window.location.href = '/';
		} catch (error) {
			console.error('Logout error:', error);
		}
	}

	function openLoginModal() {
		showMenu = false;
		window.location.href = '/';
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
					<button class="menu-item" onclick={() => navigateTo('/admin/teams')}>
						Joukkueet
					</button>
					<button class="menu-item" onclick={() => navigateTo('/admin/players')}>
						Pelaajat
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
