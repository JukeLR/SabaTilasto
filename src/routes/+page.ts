import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/auth/me');
		if (response.ok) {
			const data = await response.json();
			return {
				user: data.user,
				isLoggedIn: true
			};
		}
	} catch (error) {
		console.error('Failed to fetch user data:', error);
	}
	
	return {
		user: null,
		isLoggedIn: false
	};
};
