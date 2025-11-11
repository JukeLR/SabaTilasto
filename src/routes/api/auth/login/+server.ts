import { json, type RequestEvent } from '@sveltejs/kit';
import { getUserByUsername, verifyPassword } from '$lib/auth';

export const POST = async ({ request, cookies }: RequestEvent) => {
	try {
		const { username, password } = await request.json();

		// Validointi
		if (!username || !password) {
			return json({ error: 'Käyttäjätunnus ja salasana ovat pakollisia' }, { status: 400 });
		}

		// Hae käyttäjä
		const user = await getUserByUsername(username);
		if (!user) {
			return json({ error: 'Virheellinen käyttäjätunnus tai salasana' }, { status: 401 });
		}

		// Tarkista salasana
		const validPassword = await verifyPassword(password, user.password);
		if (!validPassword) {
			return json({ error: 'Virheellinen käyttäjätunnus tai salasana' }, { status: 401 });
		}

		// Aseta session cookie
		cookies.set('user_id', user.id.toString(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 60 * 60 * 24 * 30 // 30 päivää
		});

		return json({ 
			success: true, 
			user: { 
				id: user.id, 
				username: user.username, 
				email: user.email,
				role: user.role,
				firstName: user.first_name,
				lastName: user.last_name
			} 
		});

	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Kirjautuminen epäonnistui' }, { status: 500 });
	}
};
