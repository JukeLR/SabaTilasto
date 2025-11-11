<script lang="ts">
	function goBack() {
		window.history.back();
	}
</script>

<div class="container">
	<button class="back-button" onclick={goBack}>← Takaisin</button>
	<h1>Raportit</h1>
	<p>Raportit-sivu tulossa pian...</p>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}

	.back-button {
		background-color: #6c757d;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 10px 20px;
		cursor: pointer;
		font-size: 1rem;
		margin-bottom: 20px;
	}

	.back-button:hover {
		background-color: #5a6268;
	}

	h1 {
		color: #1a1a1a;
	}
</style>
