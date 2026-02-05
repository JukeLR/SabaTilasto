<script lang="ts">
  export let data;
  import { goto } from '$app/navigation';
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  let goalsChartEl: HTMLCanvasElement;
  let assistsChartEl: HTMLCanvasElement;
  let shotsChartEl: HTMLCanvasElement;
  let shotsOffChartEl: HTMLCanvasElement;
  let shotsBlockedChartEl: HTMLCanvasElement;
  let blocksChartEl: HTMLCanvasElement;
  let teamTurnoverGoalChartEl: HTMLCanvasElement;
  let teamTurnoverNogoalChartEl: HTMLCanvasElement;
  let opponentTurnoverGoalChartEl: HTMLCanvasElement;
  let opponentTurnoverNogoalChartEl: HTMLCanvasElement;
  let goalsChartInstance: any;
  let assistsChartInstance: any;
  let shotsChartInstance: any;
  let shotsOffChartInstance: any;
  let shotsBlockedChartInstance: any;
  let blocksChartInstance: any;
  let teamTurnoverGoalChartInstance: any;
  let teamTurnoverNogoalChartInstance: any;
  let opponentTurnoverGoalChartInstance: any;
  let opponentTurnoverNogoalChartInstance: any;

  let showReportLoading = false;

  // Chart.js tuonti dynaamisesti (vain client)
  onMount(async () => {
    const Chart = (await import('chart.js/auto')).default;
    const yAxisOptions = {
      beginAtZero: true,
      precision: 0,
      max: 10,
      ticks: { stepSize: 1 }
    };
    if (data && data.goalsPerGame) {
      if (goalsChartInstance) goalsChartInstance.destroy();
      const labels = data.goalsPerGame.map((g: any) => g.date);
      const gameIds = data.goalsPerGame.map((g: any) => g.id);
      goalsChartInstance = new Chart(goalsChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Maalit per peli',
              data: data.goalsPerGame.map((g: any) => g.goals),
              backgroundColor: '#1976d2',
              borderColor: '#1976d2',
              pointBackgroundColor: '#1976d2',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = goalsChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);                
              }
            }
          }
        }
      });
    }
    if (data && data.assistsPerGame) {
      if (assistsChartInstance) assistsChartInstance.destroy();
      const labels = data.assistsPerGame.map((a: any) => a.date);
      const gameIds = data.assistsPerGame.map((a: any) => a.id);
      assistsChartInstance = new Chart(assistsChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Syötöt per peli',
              data: data.assistsPerGame.map((a: any) => a.assists),
              backgroundColor: '#43a047',
              borderColor: '#43a047',
              pointBackgroundColor: '#43a047',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = assistsChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.shotsOnGoalPerGame) {
      if (shotsChartInstance) shotsChartInstance.destroy();
      const labels = data.shotsOnGoalPerGame.map((s: any) => s.date);
      const gameIds = data.shotsOnGoalPerGame.map((s: any) => s.id);
      shotsChartInstance = new Chart(shotsChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Vedot maalia kohti per peli',
              data: data.shotsOnGoalPerGame.map((s: any) => s.shots),
              backgroundColor: '#e65100',
              borderColor: '#e65100',
              pointBackgroundColor: '#e65100',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = shotsChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.shotsOffTargetPerGame) {
      if (shotsOffChartInstance) shotsOffChartInstance.destroy();
      const labels = data.shotsOffTargetPerGame.map((s: any) => s.date);
      const gameIds = data.shotsOffTargetPerGame.map((s: any) => s.id);
      shotsOffChartInstance = new Chart(shotsOffChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Vedot maalin ohi per peli',
              data: data.shotsOffTargetPerGame.map((s: any) => s.shots),
              backgroundColor: '#b71c1c',
              borderColor: '#b71c1c',
              pointBackgroundColor: '#b71c1c',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = shotsOffChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.shotsBlockedPerGame) {
      if (shotsBlockedChartInstance) shotsBlockedChartInstance.destroy();
      const labels = data.shotsBlockedPerGame.map((s: any) => s.date);
      const gameIds = data.shotsBlockedPerGame.map((s: any) => s.id);
      shotsBlockedChartInstance = new Chart(shotsBlockedChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Vedot blokkiin per peli',
              data: data.shotsBlockedPerGame.map((s: any) => s.shots),
              backgroundColor: '#0097a7',
              borderColor: '#0097a7',
              pointBackgroundColor: '#0097a7',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = shotsBlockedChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.blocksPerGame) {
      if (blocksChartInstance) blocksChartInstance.destroy();
      const labels = data.blocksPerGame.map((b: any) => b.date);
      const gameIds = data.blocksPerGame.map((b: any) => b.id);
      blocksChartInstance = new Chart(blocksChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Blokatut vedot per peli',
              data: data.blocksPerGame.map((b: any) => b.blocks),
              backgroundColor: '#fbc02d',
              borderColor: '#fbc02d',
              pointBackgroundColor: '#fbc02d',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = blocksChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.teamTurnoverGoalPerGame) {
      if (teamTurnoverGoalChartInstance) teamTurnoverGoalChartInstance.destroy();
      const labels = data.teamTurnoverGoalPerGame.map((t: any) => t.date);
      const gameIds = data.teamTurnoverGoalPerGame.map((t: any) => t.id);
      teamTurnoverGoalChartInstance = new Chart(teamTurnoverGoalChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pelinkäännöt maalilla per peli',
              data: data.teamTurnoverGoalPerGame.map((t: any) => t.turnovers),
              backgroundColor: '#7b1fa2',
              borderColor: '#7b1fa2',
              pointBackgroundColor: '#7b1fa2',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = teamTurnoverGoalChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.teamTurnoverNogoalPerGame) {
      if (teamTurnoverNogoalChartInstance) teamTurnoverNogoalChartInstance.destroy();
      const labels = data.teamTurnoverNogoalPerGame.map((t: any) => t.date);
      const gameIds = data.teamTurnoverNogoalPerGame.map((t: any) => t.id);
      teamTurnoverNogoalChartInstance = new Chart(teamTurnoverNogoalChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pelinkäännöt ilman maalia per peli',
              data: data.teamTurnoverNogoalPerGame.map((t: any) => t.turnovers),
              backgroundColor: '#388e3c',
              borderColor: '#388e3c',
              pointBackgroundColor: '#388e3c',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = teamTurnoverNogoalChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.opponentTurnoverGoalPerGame) {
      if (opponentTurnoverGoalChartInstance) opponentTurnoverGoalChartInstance.destroy();
      const labels = data.opponentTurnoverGoalPerGame.map((t: any) => t.date);
      const gameIds = data.opponentTurnoverGoalPerGame.map((t: any) => t.id);
      opponentTurnoverGoalChartInstance = new Chart(opponentTurnoverGoalChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pelinkäännöt vastustajalle maalilla per peli',
              data: data.opponentTurnoverGoalPerGame.map((t: any) => t.turnovers),
              backgroundColor: '#c62828',
              borderColor: '#c62828',
              pointBackgroundColor: '#c62828',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = opponentTurnoverGoalChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
    if (data && data.opponentTurnoverNogoalPerGame) {
      if (opponentTurnoverNogoalChartInstance) opponentTurnoverNogoalChartInstance.destroy();
      const labels = data.opponentTurnoverNogoalPerGame.map((t: any) => t.date);
      const gameIds = data.opponentTurnoverNogoalPerGame.map((t: any) => t.id);
      opponentTurnoverNogoalChartInstance = new Chart(opponentTurnoverNogoalChartEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Pelinkäännöt vastustajalle ilman maalia per peli',
              data: data.opponentTurnoverNogoalPerGame.map((t: any) => t.turnovers),
              backgroundColor: '#00897b',
              borderColor: '#00897b',
              pointBackgroundColor: '#00897b',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: yAxisOptions },
          onClick: (evt: any) => {
            const points = opponentTurnoverNogoalChartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
            if (points && points.length > 0) {
              const idx = points[0].index;
              const gameId = gameIds[idx];
              if (gameId) {
                showReportLoading = true;
                goto(`/reports/${gameId}/tilasto`);
              }
            }
          }
        }
      });
    }
  });

  afterNavigate(() => {
    showReportLoading = false;
  });
</script>

<main>
  <button on:click={() => window.location.href = '/games/stats'} style="margin-bottom: 18px; padding: 8px 18px; font-size: 1rem; border-radius: 8px; border: 1px solid #b5c6d6; background: #e3f0fa; color: #222; cursor: pointer;">
    ← Takaisin
  </button>
  <h1>{data.playerName}</h1>
  <h2>Maalit per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={goalsChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Syötöt per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={assistsChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Vedot maalia kohti per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={shotsChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Vedot maalin ohi per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={shotsOffChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Vedot blokkiin per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={shotsBlockedChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Blokatut vedot per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={blocksChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Pelinkäännöt maalilla per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={teamTurnoverGoalChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Pelinkäännöt ilman maalia per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={teamTurnoverNogoalChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Pelinkäännöt vastustajalle maalilla per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={opponentTurnoverGoalChartEl} style="width:100%; height:400px;"></canvas>
  </div>
  <h2>Pelinkäännöt vastustajalle ilman maalia per peli</h2>
  <div style="width:100%; max-width:100%; margin-bottom:32px;">
    <canvas bind:this={opponentTurnoverNogoalChartEl} style="width:100%; height:400px;"></canvas>
  </div>

  {#if showReportLoading}
    <div class="modal-loading">Ladataan...</div>
  {/if}
  <!-- Lisää sisältöä tähän jatkossa -->
</main>
<style>  
  .modal-loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-size: 2rem;
    color: #fff;
    font-weight: bold;
    letter-spacing: 1px;
    backdrop-filter: blur(2px);
  }
</style>
