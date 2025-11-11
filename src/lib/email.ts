import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

// Luo sähköpostin lähettäjä
function createTransporter() {
	// Tarkista että kaikki tarvittavat muuttujat on asetettu
	if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
		console.warn('SMTP-asetukset puuttuvat .env-tiedostosta. Sähköpostit eivät lähde.');
		return null;
	}

	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: parseInt(env.SMTP_PORT),
		secure: false, // true for 465, false for other ports
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS
		}
	});
}

export interface SendPasswordResetEmailParams {
	to: string;
	username: string;
	newPassword: string;
}

/**
 * Lähettää sähköpostin uudella salasanalla
 */
export async function sendPasswordResetEmail({ to, username, newPassword }: SendPasswordResetEmailParams): Promise<boolean> {
	try {
		const transporter = createTransporter();
		
		// Jos SMTP ei ole konfiguroitu, logaa vain konsoliin
		if (!transporter) {
			console.log('=== SALASANAN PALAUTUS ===');
			console.log(`Käyttäjä: ${username}`);
			console.log(`Sähköposti: ${to}`);
			console.log(`Uusi salasana: ${newPassword}`);
			console.log('=========================');
			console.log('HUOM: Sähköpostia ei lähetetty koska SMTP ei ole konfiguroitu.');
			console.log('Lue EMAIL_SETUP.md tiedostosta ohjeet sähköpostin konfigurointiin.');
			return false;
		}

		const fromAddress = env.SMTP_FROM || 'SabaTilasto <noreply@sabatilasto.fi>';

		const mailOptions = {
			from: fromAddress,
			to: to,
			subject: 'SabaTilasto - Uusi salasana',
			html: `
				<!DOCTYPE html>
				<html>
				<head>
					<style>
						body {
							font-family: Arial, sans-serif;
							line-height: 1.6;
							color: #333;
						}
						.container {
							max-width: 600px;
							margin: 0 auto;
							padding: 20px;
							background-color: #f8f9fa;
							border-radius: 8px;
						}
						.header {
							background-color: #4a90e2;
							color: white;
							padding: 20px;
							text-align: center;
							border-radius: 8px 8px 0 0;
						}
						.content {
							background-color: white;
							padding: 30px;
							border-radius: 0 0 8px 8px;
						}
						.password-box {
							background-color: #f0f7ff;
							border: 2px solid #4a90e2;
							padding: 15px;
							margin: 20px 0;
							text-align: center;
							font-size: 1.2rem;
							font-weight: bold;
							border-radius: 6px;
							letter-spacing: 2px;
						}
						.warning {
							background-color: #fff3cd;
							border-left: 4px solid #ffc107;
							padding: 15px;
							margin: 20px 0;
						}
						.footer {
							text-align: center;
							margin-top: 20px;
							font-size: 0.9rem;
							color: #666;
						}
					</style>
				</head>
				<body>
					<div class="container">
						<div class="header">
							<h1>SabaTilasto</h1>
						</div>
						<div class="content">
							<h2>Uusi salasana</h2>
							<p>Hei <strong>${username}</strong>,</p>
							<p>Pyysit uutta salasanaa SabaTilasto-sovellukseen. Uusi salasanasi on:</p>
							
							<div class="password-box">
								${newPassword}
							</div>
							
							<div class="warning">
								<strong>Tärkeää:</strong> Suosittelemme vaihtamaan salasanasi heti sisäänkirjautumisen jälkeen 
								turvallisemmaksi profiilin asetuksista.
							</div>
							
							<p>Jos et pyytänyt salasanan vaihtoa, ole yhteydessä järjestelmän ylläpitäjään välittömästi.</p>
							
							<p>Ystävällisin terveisin,<br>SabaTilasto-tiimi</p>
						</div>
						<div class="footer">
							<p>Tämä on automaattinen viesti. Älä vastaa tähän sähköpostiin.</p>
						</div>
					</div>
				</body>
				</html>
			`
		};

		await transporter.sendMail(mailOptions);
		return true;
	} catch (error) {
		console.error('Sähköpostin lähetys epäonnistui:', error);
		return false;
	}
}
