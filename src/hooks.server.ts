import type { Handle } from '@sveltejs/kit';
import { getUserById } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const userId = event.cookies.get('user_id');
	if (userId) {
		const user = await getUserById(Number(userId));
		if (user) {
			event.locals.user = user;
		}
	}
	return resolve(event);
};
