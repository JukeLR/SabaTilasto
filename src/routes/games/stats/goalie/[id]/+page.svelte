<script lang="ts">
    let goalsAgainstChartEl: HTMLCanvasElement;
    let goalsAgainstChartInstance: any;
  export let data: any;
  import { goto } from '$app/navigation';
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  let savesScatterEl: HTMLCanvasElement;
  let savesScatterInstance: any;

  let showReportLoading = false;

  onMount(async () => {

        // Torjuntaprosentti -kaavio
        if (data.savesPerGame && data.goalsAgainstPerGame) {
          if (window.torjuntaPctChartInstance) window.torjuntaPctChartInstance.destroy();
          const pctLabels = data.savesPerGame.map((g: any) => g.date);
          const pctGameIds = data.savesPerGame.map((g: any) => g.id);
          const pctData = data.savesPerGame.map((g: any, i: number) => {
            const saves = g.saves;
            const goals = data.goalsAgainstPerGame[i]?.goals ?? 0;
            const total = saves + goals;
            if (total === 0) return null;
            return Math.round((saves / total) * 1000) / 10; // 1 desimaali
          });
          const Chart = (await import('chart.js/auto')).default;
          const ctx = document.getElementById('torjuntaPctChart') as HTMLCanvasElement;
          window.torjuntaPctChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
              labels: pctLabels,
              datasets: [
                {
                  label: 'Torjuntaprosentti per peli',
                  data: pctData,
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
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function(context: any) {
                      const idx = context.dataIndex;
                      const date = pctLabels[idx];
                      const value = context.raw;
                      return `${date}: ${value !== null ? value.toFixed(1) : '-'} %`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: { stepSize: 10 }
                }
              },
              onClick: (evt: any, elements: any[]) => {
                if (elements && elements.length > 0) {
                  const idx = elements[0].index;
                  const gameId = pctGameIds[idx];
                  if (gameId) {
                    showReportLoading = true;
                    goto(`/reports/${gameId}/tilasto`);
                  }
                }
              }
            }
          });
        }
    if (!data?.savesPerGame) return;
    const Chart = (await import('chart.js/auto')).default;
    if (savesScatterInstance) savesScatterInstance.destroy();
    const labels = data.savesPerGame.map((g: any) => g.date);
    const saves = data.savesPerGame.map((g: any) => g.saves);
    const gameIds = data.savesPerGame.map((g: any) => g.id);
    savesScatterInstance = new Chart(savesScatterEl, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Torjunnat per peli',
            data: saves,
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
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const idx = context.dataIndex;
                const date = labels[idx];
                const value = context.raw;
                return `${date}: ${value} torjuntaa`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            precision: 0,
            ticks: { stepSize: 1 }
          }
        },
        onClick: (evt: any, elements: any[]) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const gameId = gameIds[idx];
            if (gameId) {
              showReportLoading = true;
              goto(`/reports/${gameId}/tilasto`);
            }
          }
        }
      }
    });

    // Päästetyt maalit -kaavio
    if (data.goalsAgainstPerGame) {
      if (goalsAgainstChartInstance) goalsAgainstChartInstance.destroy();
      const gaLabels = data.goalsAgainstPerGame.map((g: any) => g.date);
      const goals = data.goalsAgainstPerGame.map((g: any) => g.goals);
      const gaGameIds = data.goalsAgainstPerGame.map((g: any) => g.id);
      goalsAgainstChartInstance = new Chart(goalsAgainstChartEl, {
        type: 'line',
        data: {
          labels: gaLabels,
          datasets: [
            {
              label: 'Päästetyt maalit per peli',
              data: goals,
              backgroundColor: '#d32f2f',
              borderColor: '#d32f2f',
              pointBackgroundColor: '#d32f2f',
              pointRadius: 5,
              fill: false,
              tension: 0.1,
              showLine: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context: any) {
                  const idx = context.dataIndex;
                  const date = gaLabels[idx];
                  const value = context.raw;
                  return `${date}: ${value} päästettyä maalia`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              precision: 0,
              ticks: { stepSize: 1 }
            }
          },
          onClick: (evt: any, elements: any[]) => {
            if (elements && elements.length > 0) {
              const idx = elements[0].index;
              const gameId = gaGameIds[idx];
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
    <h2>{data.goalie?.first_name} {data.goalie?.last_name}</h2>
    <h3>Torjunnat per peli</h3>
    <div style="width:100%; max-width:100%; margin-bottom:32px;">
      <canvas bind:this={savesScatterEl} style="width:100%; height:400px;"></canvas>
    </div>

    <h3>Päästetyt maalit per peli</h3>
    <div style="width:100%; max-width:100%; margin-bottom:32px;">
      <canvas bind:this={goalsAgainstChartEl} style="width:100%; height:400px;"></canvas>
    </div>
    <h3>Torjuntaprosentti per peli</h3>
    <div style="width:100%; max-width:100%; margin-bottom:32px;">
        <canvas id="torjuntaPctChart" style="width:100%; height:400px;"></canvas>
    </div>

    {#if showReportLoading}
    <div class="modal-loading">Ladataan...</div>
    {/if}

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

