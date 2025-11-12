import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, parent }) => {
	const { user, isLoggedIn } = await parent();
	
	return {
		user,
		isLoggedIn
	};
};
