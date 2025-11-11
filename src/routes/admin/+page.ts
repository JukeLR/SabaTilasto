import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api/auth/me');
	if (response.ok) {
		const data = await response.json();
		
		// Tarkista että käyttäjä on admin
		if (data.user?.role !== 'admin') {
			throw redirect(303, '/');
		}
		
		return {
			user: data.user
		};
	}
	
	throw redirect(303, '/');
};
