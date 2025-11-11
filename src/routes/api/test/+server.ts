import { json } from '@sveltejs/kit';
import { DATABASE_URL } from '$env/static/private';

export const GET = async () => {
	return json({ 
		hasUrl: !!DATABASE_URL,
		urlLength: DATABASE_URL?.length || 0
	});
};
