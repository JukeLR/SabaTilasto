import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
  const gameId = params.id;

  // Hae kaikki laukaukset tälle pelille backendistä (oma API, joka hakee Neonista)
  const res = await fetch(`/api/shotmap?games_id=${gameId}`);
  const allShots = await res.json(); // [{ x, y, team, type, player_id, games_id }]

  // Erottele home/away ja muunnetaan team-arvo stringiksi ('home'/'away')
  const homeShots = allShots
    .filter((s: any) => s.team === 1)
    .map((s: any) => ({
      ...s,
      team: 'home',
      x: Number(s.x),
      y: Number(s.y)
    }));

  const awayShots = allShots
    .filter((s: any) => s.team === 0)
    .map((s: any) => ({
      ...s,
      team: 'away',
      x: Number(s.x),
      y: Number(s.y)
    }));
  console.log('homeShots:', homeShots);
  console.log('awayShots:', awayShots);

  let xgError: string | null = null;

  // Laske home xG
  const resHome = await fetch('/api/xg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(homeShots)
  });
  let dataHome = { xg_total: null };
  if (resHome.ok) {
    dataHome = await resHome.json();
  } else {
    const err = await resHome.json().catch(() => null);
    xgError = err?.error ? `${err.error}: ${err.details}` : 'Tuntematon xG-virhe';
    dataHome.xg_total = null;
  }

  // Laske away xG
  const resAway = await fetch('/api/xg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(awayShots)
  });
  let dataAway = { xg_total: null };
  if (resAway.ok) {
    dataAway = await resAway.json();
  } else {
    const err = await resAway.json().catch(() => null);
    xgError = err?.error ? `${err.error}: ${err.details}` : 'Tuntematon xG-virhe';
    dataAway.xg_total = null;
  }

  console.log('homeXG:', dataHome.xg_total);
  console.log('awayXG:', dataAway.xg_total);

  return {
    homeXG: dataHome.xg_total,
    awayXG: dataAway.xg_total,
    xgError
  };
};
