import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserByEmail } from '$lib/auth';
import bcrypt from 'bcryptjs';
import { sql } from '$lib/db';
import { sendPasswordResetEmail } from '$lib/email';

// Funktio satunnaisen salasanan generointiin
function generateRandomPassword(length: number = 12): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
	let password = '';
	for (let i = 0; i < length; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return password;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();

		if (!email) {
			return json(
				{ success: false, error: 'Sähköposti on pakollinen' },
				{ status: 400 }
			);
		}

		// Tarkista löytyykö käyttäjä
		const user = await getUserByEmail(email);
        
		if (!user) {
			// Turvallisuussyistä ei paljasteta onko käyttäjää olemassa
			return json({
				success: true,
				message: 'Jos sähköposti löytyy, uusi salasana lähetetään sähköpostiin'
			});
		}

		// Generoi uusi satunnainen salasana
		const newPassword = generateRandomPassword();
        
		// Hashaa uusi salasana
		const hashedPassword = await bcrypt.hash(newPassword, 10);

		// Päivitä salasana tietokantaan
		await sql`
			UPDATE users 
			SET password = ${hashedPassword},
				updated_at = NOW()
			WHERE email = ${email}
		`;

		// Lähetä sähköposti uudella salasanalla
		const emailSent = await sendPasswordResetEmail({
			to: user.email,
			username: user.username,
			newPassword: newPassword
		});

		if (!emailSent) {
			console.error(`Sähköpostin lähetys epäonnistui käyttäjälle ${user.username}`);
			console.log(`HUOM: Salasana päivitettiin tietokantaan, mutta sähköpostia ei lähetetty.`);
			console.log(`Uusi salasana käyttäjälle ${user.username}: ${newPassword}`);
		}

		// Piilotetaan sähköpostiosoite osittain
		const emailParts = user.email.split('@');
		const maskedEmail = `${user.email.substring(0, 3)}***@${emailParts[1]}`;

		return json({
			success: true,
			message: emailSent 
				? `Uusi salasana on lähetetty sähköpostiin ${maskedEmail}`
				: `Salasana on vaihdettu. Tarkista palvelimen konsoli salasanan saamiseksi (sähköpostilähetys ei ole konfiguroitu).`
		});

	} catch (error) {
		console.error('Virhe salasanan palauttamisessa:', error);
		return json(
			{ success: false, error: 'Salasanan palauttaminen epäonnistui' },
			{ status: 500 }
		);
	}
};
