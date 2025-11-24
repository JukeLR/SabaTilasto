<script lang="ts">
let email = $state('');
let message = $state('');
let error = $state('');
let isLoading = $state(false);

async function handleForgotPassword() {
    error = '';
    message = '';
    isLoading = true;
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            message = 'Jos sähköposti löytyy järjestelmästä, ohjeet salasanan vaihtoon on lähetetty.';
        } else {
            error = data.error || 'Virhe pyynnössä.';
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
        <h1>Unohtuiko salasana?</h1>
        {#if message}
            <div class="success-message">{message}</div>
        {/if}
        {#if error}
            <div class="error-message">{error}</div>
        {/if}
        <form on:submit|preventDefault={handleForgotPassword}>
            <div class="form-group">
                <label for="email">Sähköposti</label>
                <input type="email" id="email" bind:value={email} required disabled={isLoading} />
            </div>
            <button type="submit" disabled={isLoading}>
                {isLoading ? 'Lähetetään...' : 'Lähetä ohjeet sähköpostiin'}
            </button>
        </form>
        <div class="auth-link" style="margin-top:1rem;">
            <a href="/login">Takaisin kirjautumiseen</a>
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
.success-message {
    background-color: #e6ffe6;
    color: #228B22;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
    text-align: center;
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
