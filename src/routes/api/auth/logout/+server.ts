import { json, type RequestEvent } from '@sveltejs/kit';

export const POST = async ({ cookies }: RequestEvent) => {
	// Poista cookie samoilla asetuksilla kuin se asetettiin
	cookies.set('user_id', '', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: 0 // Aseta vanhenemisaika nollaan
	});
	
	// Varmistetaan myös delete-kutsulla
	cookies.delete('user_id', { path: '/' });
	
	return json({ success: true });
};
