<script lang="ts">
	let selectedPeriod = $state(1);

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
</script>

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

		<button class="back-button" onclick={closeSummary}>Takaisin</button>
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
