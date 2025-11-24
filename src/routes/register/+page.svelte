<script lang="ts">
	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let error = $state('');
	let isLoading = $state(false);

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

		isLoading = true;

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, email, password, firstName, lastName })
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
