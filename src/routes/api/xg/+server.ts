import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    const shots = await request.json();
    try {
        const response = await fetch('https://xg-api-235492266180.europe-north1.run.app/calculate_xg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shots)
        });
        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({ error: 'xG API error', details: errorText }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'xG API connection error', details: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
