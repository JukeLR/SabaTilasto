
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const id = params.id;
  // Hae kirjautunut käyttäjä
  const userRes = await fetch('/api/auth/me');
  if (userRes.ok) {
    const userData = await userRes.json();
    const user = userData.user;
    if (user?.role === 'pelaaja') {
      // Pelaaja pääsee vain omalle sivulleen
      const playerIds = Array.isArray(user.player_ids) ? user.player_ids.map((x: any) => String(x)) : [];
      if (!playerIds.includes(String(id))) {
        throw redirect(303, '/');
      }
    }
  }
  const res = await fetch(`/api/games/stats/goalie/${id}`);
  if (!res.ok) throw error(404, 'Maalivahtia ei löytynyt');
  const data = await res.json();
  // Palauta kaikki API:n palauttamat kentät suoraan
  return { ...data };
};
