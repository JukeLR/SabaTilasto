import { json, type RequestEvent } from '@sveltejs/kit';
import { createUser, getUserByUsername, getUserByEmail } from '$lib/auth';

export const POST = async ({ request, cookies }: RequestEvent) => {
	try {
		const { username, email, password, firstName, lastName } = await request.json();

		// Validointi
		if (!username || !email || !password) {
			return json({ error: 'Käyttäjätunnus, sähköposti ja salasana ovat pakollisia' }, { status: 400 });
		}

		if (username.length < 3) {
			return json({ error: 'Käyttäjätunnuksen tulee olla vähintään 3 merkkiä pitkä' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ error: 'Salasanan tulee olla vähintään 6 merkkiä pitkä' }, { status: 400 });
		}

		// Tarkista onko käyttäjätunnus tai email jo käytössä
		const existingUsername = await getUserByUsername(username);
		if (existingUsername) {
			return json({ error: 'Käyttäjätunnus on jo käytössä' }, { status: 400 });
		}

		const existingEmail = await getUserByEmail(email);
		if (existingEmail) {
			return json({ error: 'Sähköpostiosoite on jo käytössä' }, { status: 400 });
		}

		// Luo uusi käyttäjä
		const user = await createUser(username, email, password, firstName, lastName);

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
		console.error('Registration error:', error);
		// Lähetä tarkempi virheviesti kehityksessä
		const errorMessage = error instanceof Error ? error.message : 'Rekisteröinti epäonnistui';
		return json({ error: 'Rekisteröinti epäonnistui', details: errorMessage }, { status: 500 });
	}
};
