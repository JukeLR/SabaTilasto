<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let user = $state<any>(null);
	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let saving = $state(false);

	// Lomakkeen kentät
	let username = $state('');
	let email = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Roolin käännös
	function getRoleName(role: string): string {
		const roleNames: Record<string, string> = {
			'admin': 'Ylläpitäjä',
			'junioripäällikkö': 'Junioripäällikkö',
			'vastuuvalmentaja': 'Vastuuvalmentaja',
			'toimihenkilö': 'Toimihenkilö',
			'kirjuri': 'Kirjuri',
			'pelaaja': 'Pelaaja'
		};
		return roleNames[role] || role;
	}

	onMount(async () => {
		await loadProfile();
	});

	async function loadProfile() {
		try {
			const response = await fetch('/api/auth/me');
			if (!response.ok) {
				if (response.status === 401) {
					if (typeof window !== 'undefined') {
						goto('/login');
					}
					return;
				}
				throw new Error('Profiilin lataaminen epäonnistui');
			}
			const data = await response.json();
			user = data.user || data; // Tue molempia formaatteja
			username = user.username || '';
			email = user.email || '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe ladattaessa profiilia';
		} finally {
			loading = false;
		}
	}

	async function updateProfile() {
		error = '';
		success = '';

		// Validointi
		if (!username.trim()) {
			error = 'Käyttäjänimi on pakollinen';
			return;
		}

		if (newPassword || confirmPassword) {
			if (!currentPassword) {
				error = 'Anna nykyinen salasana';
				return;
			}
			if (newPassword !== confirmPassword) {
				error = 'Uudet salasanat eivät täsmää';
				return;
			}
			if (newPassword.length < 6) {
				error = 'Uuden salasanan tulee olla vähintään 6 merkkiä';
				return;
			}
		}

		saving = true;

		try {
			const updateData: any = {
				username: username.trim(),
				email: email.trim()
			};

			// Jos salasana muutetaan
			if (newPassword) {
				updateData.currentPassword = currentPassword;
				updateData.newPassword = newPassword;
			}

			const response = await fetch('/api/auth/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updateData),
				credentials: 'include'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Profiilin päivitys epäonnistui');
			}

			success = 'Profiili päivitetty onnistuneesti';
			
			// Tyhjennä salasanakentät
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';

			// Päivitä käyttäjätiedot
			await loadProfile();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Virhe päivitettäessä profiilia';
		} finally {
			saving = false;
		}
	}

</script>

<div class="profile-page">
	<div class="profile-header">
		<h1>Oma profiili</h1>
	</div>

	{#if loading}
		<div class="loading">Ladataan profiilia...</div>
	{:else if user}
		<div class="profile-container">
			<div class="profile-info">
				<div class="info-row">
					<span class="label">Rooli:</span>
					<span class="role-text">{getRoleName(user.role)}</span>
				</div>
			</div>

			<form class="profile-form" onsubmit={(e) => { e.preventDefault(); updateProfile(); }}>
				<div class="form-group">
					<label for="username">Käyttäjänimi *</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						required
						disabled={saving}
					/>
				</div>

				<div class="form-group">
					<label for="email">Sähköposti</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						disabled={saving}
					/>
				</div>

				<div class="divider">
					<span>Vaihda salasana (valinnainen)</span>
				</div>

				<div class="form-group">
					<label for="currentPassword">Nykyinen salasana</label>
					<input
						type="password"
						id="currentPassword"
						bind:value={currentPassword}
						disabled={saving}
						autocomplete="current-password"
					/>
				</div>

				<div class="form-group">
					<label for="newPassword">Uusi salasana</label>
					<input
						type="password"
						id="newPassword"
						bind:value={newPassword}
						disabled={saving}
						autocomplete="new-password"
					/>
				</div>

				<div class="form-group">
					<label for="confirmPassword">Vahvista uusi salasana</label>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						disabled={saving}
						autocomplete="new-password"
					/>
				</div>

				{#if error}
					<div class="message error">{error}</div>
				{/if}

				{#if success}
					<div class="message success">{success}</div>
				{/if}

				<button type="submit" class="save-button" disabled={saving}>
					{saving ? 'Tallennetaan...' : 'Tallenna muutokset'}
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.profile-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 20px;
	}

	.profile-header {
		margin-bottom: 30px;
	}

	h1 {
		margin: 0;
		color: #333;
	}

	.loading {
		text-align: center;
		padding: 40px;
		color: #666;
	}

	.profile-container {
		background: white;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.profile-info {
		margin-bottom: 30px;
		padding-bottom: 20px;
		border-bottom: 1px solid #eee;
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.label {
		font-weight: 600;
		color: #666;
	}

	.role-text {
		color: #333;
		font-weight: 500;
	}

	.role-badge {
		background-color: #007bff;
		color: white;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.profile-form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label {
		font-weight: 600;
		color: #333;
	}

	.form-group input {
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
	}

	.form-group input:focus {
		outline: none;
		border-color: #007bff;
	}

	.form-group input:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}

	.divider {
		margin: 10px 0;
		text-align: center;
		position: relative;
	}

	.divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: #ddd;
	}

	.divider span {
		position: relative;
		background: white;
		padding: 0 15px;
		color: #666;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.message {
		padding: 12px;
		border-radius: 6px;
		font-weight: 500;
	}

	.message.error {
		background-color: #fee;
		color: #c00;
		border: 1px solid #fcc;
	}

	.message.success {
		background-color: #efe;
		color: #060;
		border: 1px solid #cfc;
	}

	.save-button {
		padding: 14px;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.save-button:hover:not(:disabled) {
		background-color: #0056b3;
	}

	.save-button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.profile-page {
			padding: 15px;
		}

		.profile-container {
			padding: 15px;
		}
	}
</style>
