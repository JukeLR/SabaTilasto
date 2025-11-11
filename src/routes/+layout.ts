import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch }) => {
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
		console.error('Error loading user:', error);
	}
	
	return {
		user: null,
		isLoggedIn: false
	};
};
