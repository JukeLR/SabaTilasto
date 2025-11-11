import { json, type RequestEvent } from '@sveltejs/kit';

export const POST = async ({ cookies }: RequestEvent) => {
	cookies.delete('user_id', { path: '/' });
	
	return json({ success: true });
};
