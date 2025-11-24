import type { LayoutLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ fetch, url }) => {
	const pathname = url.pathname;
	try {
		const response = await fetch('/api/auth/me');
		if (response.ok) {
			const data = await response.json();
			const user = data.user;
			const role = user?.role;

			// Admin pääsee kaikille sivuille
			if (role === 'admin') {
				return {
					user,
					isLoggedIn: true
				};
			}

			// Toimihenkilö pääsee etusivulle, tilastoihin, omaan profiiliin ja raportteihin
			if (role === 'toimihenkilö') {
				// Sallitut polut: etusivu, tilastot, oma profiili, raportit ja kaikki raporttien alasivut
				const allowedPaths = ['/', '/games/stats', '/profile'];
				if (
					allowedPaths.includes(pathname) ||
					pathname.startsWith('/reports')
				) {
					return {
						user,
						isLoggedIn: true
					};
				} else {
					throw redirect(303, '/');
				}
			}

			// Tuntematon tai puuttuva rooli
			const allowedRoles = ['admin', 'toimihenkilö', 'junioripäällikkö', 'vastuuvalmentaja', 'kirjuri', 'pelaaja'];
			if (!role || !allowedRoles.includes(role)) {
				console.error('Tuntematon rooli:', role, 'Käyttäjä:', user?.username);
				// Voit halutessasi palauttaa virhesivun tai näyttää ilmoituksen
				throw redirect(303, '/');
			}

			// Muut roolit: vain etusivu
			if (pathname !== '/') {
				throw redirect(303, '/');
			}
			return {
				user,
				isLoggedIn: true
			};
		}
	} catch (error) {
		console.error('Error loading user:', error);
	}

	// Salli kirjautumattomille tietyt sivut
	const publicPaths = ['/', '/login', '/register', '/login/forgot-password'];
	if (!publicPaths.includes(pathname)) {
		throw redirect(303, '/');
	}
	return {
		user: null,
		isLoggedIn: false
	};
};
