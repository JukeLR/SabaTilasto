<script lang="ts">
let showPrivacy = false;
import { onMount } from 'svelte';
	let username = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let firstName = '';
	let lastName = '';
	let error = '';
	let isLoading = false;

	// Joukkuevalinta
	let teams: Array<{ id: number, name: string, age_group: string }> = [];
	let selectedTeamId: string = '';

	// Hae joukkueet kun sivu avautuu
	onMount(async () => {
		try {
			const res = await fetch('/api/admin/teams');
			const data = await res.json();
			if (res.ok && Array.isArray(data.teams)) {
				teams = data.teams;
			}
		} catch (e) {
			// ignore
		}
	});

	async function handleRegister() {
		error = '';

		if (password !== confirmPassword) {
			error = 'Salasanat eivät täsmää';
			return;
		}
		if (!firstName || !lastName) {
			error = 'Etunimi ja sukunimi ovat pakollisia';
			return;
		}
		if (!selectedTeamId) {
			error = 'Valitse oma joukkue';
			return;
		}

		isLoading = true;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, email, password, firstName, lastName, teamId: selectedTeamId })
			});

			const data = await response.json();

			if (response.ok) {
				// Ohjaa pääsivulle
				window.location.href = '/';
			} else {
				error = data.error || 'Rekisteröinti epäonnistui';
			}
		} catch (err) {
			error = 'Yhteysvirhe. Yritä uudelleen.';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="auth-container">
	<div class="auth-box">
		<h1>Rekisteröidy</h1>
		
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
		<div class="privacy-info">
			Lisätietoja henkilötietojen käsittelystä löydät
			<a href="#" onclick={(e) => { e.preventDefault(); showPrivacy = true; }}>tietosuojaselosteesta</a>.
		</div>

		{#if showPrivacy}
			<div class="privacy-modal-backdrop" onclick={() => showPrivacy = false}>
				<div class="privacy-modal" onclick={e => e.stopPropagation()}>
					<h2>Tietosuojaseloste – Saba‑Tilasto</h2>
					<p><strong>Rekisterinpitäjä:</strong><br />
					Jukka Latva‑Ranta<br />
					jukka.latvaranta@gmail.com<br />
					+358 400 805091</p>
					<p><strong>Rekisterin nimi:</strong><br />
					Saba‑Tilasto Käyttäjärekisteri</p>
					<p><strong>Kerättävät tiedot:</strong><br />
					– Nimi<br />
					– Käyttäjätunnus<br />
					– Sähköpostiosoite</p>
					<p><strong>Käsittelyn tarkoitus:</strong><br />
					– Käyttäjätilien hallinta<br />
					– Unohtuneen salasanan palautus<br />
					– Palvelun toimivuuden varmistaminen</p>
					<p><strong>Oikeusperuste:</strong><br />
					– Sopimus (käyttäjätilin luominen)<br />
					– Oikeutettu etu (palvelun ylläpito ja tietoturva)</p>
					<p><strong>Tietojen säilytys:</strong><br />
					Tietoja säilytetään niin kauan kuin käyttäjätili on aktiivinen tai kunnes käyttäjä pyytää poistamista, ellei lakisääteinen velvoite edellytä säilytystä.</p>
					<p><strong>Tietojen luovutus:</strong><br />
					Tietoja ei luovuteta kolmansille osapuolille ilman perusteltua tarvetta. Tietoja ei siirretä EU/ETA‑alueen ulkopuolelle ilman asianmukaista suojaa.</p>
					<p><strong>Rekisteröidyn oikeudet:</strong><br />
					Käyttäjä voi pyytää tietojensa tarkastamista, oikaisua, poistamista tai käsittelyn rajoittamista ottamalla yhteyttä rekisterinpitäjään.</p>
					<button class="close-modal" onclick={() => showPrivacy = false}>Sulje</button>
				</div>
			</div>
		{/if}

			<div class="form-group">
				<label for="firstName">Etunimi</label>
				<input 
					type="text" 
					id="firstName" 
					bind:value={firstName}
					required 
					disabled={isLoading}
				/>
			</div>
			<div class="form-group">
				<label for="lastName">Sukunimi</label>
				<input 
					type="text" 
					id="lastName" 
					bind:value={lastName}
					required 
					disabled={isLoading}
				/>
			</div>

			<div class="form-group">
				<label for="team">Oma joukkue</label>
				<select id="team" bind:value={selectedTeamId} required disabled={isLoading}>
					<option value="" disabled>Valitse joukkue</option>
					{#each teams as team}
						<option value={team.id}>{team.name}{team.age_group ? ` (${team.age_group})` : ''}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="username">Käyttäjätunnus</label>
				<input 
					type="text" 
					id="username" 
					bind:value={username}
					required 
					disabled={isLoading}
				/>
			</div>

			<div class="form-group">
				<label for="email">Sähköposti</label>
				<input 
					type="email" 
					id="email" 
					bind:value={email}
					required 
					disabled={isLoading}
				/>
			</div>

			<div class="form-group">
				<label for="password">Salasana</label>
				<input 
					type="password" 
					id="password" 				
					bind:value={password}
					required 
					disabled={isLoading}
				/>
			</div>

			<div class="form-group">
				<label for="confirmPassword">Vahvista salasana</label>
				<input 
					type="password" 
					id="confirmPassword" 
					bind:value={confirmPassword}
					required 
					disabled={isLoading}
				/>
			</div>

			<button type="submit" disabled={isLoading}>
				{isLoading ? 'Rekisteröidään...' : 'Rekisteröidy'}
			</button>
		</form>

		<div class="auth-link">
			Onko sinulla jo tili? <a href="/login">Kirjaudu sisään</a>
		</div>
	</div>
</div>

<style>
	.privacy-info {
		margin-bottom: 18px;
		font-size: 0.98rem;
		color: #444;
		text-align: left;
	}
	.privacy-info a {
		color: #4a90e2;
		text-decoration: underline;
		cursor: pointer;
	}
	.privacy-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0,0,0,0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.privacy-modal {
		background: #fff;
		padding: 32px 24px 24px 24px;
		border-radius: 10px;
		max-width: 420px;
		width: 95vw;
		box-shadow: 0 4px 24px rgba(0,0,0,0.18);
		position: relative;
		color: #222;
		font-size: 1rem;
	}
	.privacy-modal h2 {
		font-size: 1.2rem;
		margin-bottom: 18px;
		text-align: center;
	}
	.privacy-modal p {
		margin-bottom: 12px;
		line-height: 1.5;
	}
	.close-modal {
		margin-top: 10px;
		display: block;
		width: 100%;
		padding: 10px;
		background: #4a90e2;
		color: #fff;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}
	.close-modal:hover {
		background: #357abd;
	}
	.auth-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background-color: #f5f5f5;
		padding: 20px;
	}

	.auth-box {
		background: white;
		padding: 40px;
		border-radius: 12px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		width: 100%;
		max-width: 400px;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 30px;
		text-align: center;
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

	.form-group {
		margin-bottom: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #333;
	}

	input {
		width: 100%;
		padding: 12px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #4a90e2;
	}

	input:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}

	button {
		width: 100%;
		padding: 14px;
		background-color: #4a90e2;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	select {
		width: 100%;
		padding: 12px;
		border: 2px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
		background: #fff;
	}
	select:disabled {
		background-color: #f5f5f5;
		cursor: not-allowed;
	}
	button:hover:not(:disabled) {
		background-color: #357abd;
	}
	button:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
	.auth-link {
		margin-top: 20px;
		text-align: center;
		color: #666;
	}
	.auth-link a {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 600;
	}
	.auth-link a:hover {
		text-decoration: underline;
	}
</style>
