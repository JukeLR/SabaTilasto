import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/db';
import bcrypt from 'bcryptjs';

export const PATCH: RequestHandler = async ({ locals, request }) => {
	const user = locals.user as any;
	
	if (!user) {
		return json({ error: 'Ei valtuutusta' }, { status: 401 });
	}

	try {
		const { username, email, currentPassword, newPassword } = await request.json();

		// Validoi käyttäjänimi
		if (!username || !username.trim()) {
			return json({ error: 'Käyttäjänimi on pakollinen' }, { status: 400 });
		}

		// Tarkista onko käyttäjänimi jo käytössä (jos muutettu)
		if (username !== user.username) {
			const existingUser = await sql`
				SELECT id FROM users WHERE username = ${username} AND id != ${user.id}
			`;
			
			if (existingUser.length > 0) {
				return json({ error: 'Käyttäjänimi on jo käytössä' }, { status: 400 });
			}
		}

		// Jos salasana vaihdetaan
		if (newPassword) {
			if (!currentPassword) {
				return json({ error: 'Anna nykyinen salasana' }, { status: 400 });
			}

			// Tarkista nykyinen salasana
			const userWithPassword = await sql`
				SELECT password FROM users WHERE id = ${user.id}
			`;
			
			if (userWithPassword.length === 0) {
				return json({ error: 'Käyttäjää ei löydy' }, { status: 404 });
			}
			
			const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword[0].password);
			
			if (!isPasswordValid) {
				return json({ error: 'Nykyinen salasana on virheellinen' }, { status: 400 });
			}

			if (newPassword.length < 6) {
				return json({ error: 'Uuden salasanan tulee olla vähintään 6 merkkiä' }, { status: 400 });
			}

			// Hash uusi salasana
			const hashedPassword = await bcrypt.hash(newPassword, 10);

			// Päivitä käyttäjätiedot ja salasana
			await sql`
				UPDATE users 
				SET username = ${username.trim()}, 
					email = ${email?.trim() || null}, 
					password = ${hashedPassword}, 
					updated_at = NOW()
				WHERE id = ${user.id}
			`;
		} else {
			// Päivitä vain käyttäjätiedot ilman salasanaa
			await sql`
				UPDATE users 
				SET username = ${username.trim()}, 
					email = ${email?.trim() || null}, 
					updated_at = NOW()
				WHERE id = ${user.id}
			`;
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error updating profile:', err);
		return json({ error: 'Profiilin päivitys epäonnistui' }, { status: 500 });
	}
};
