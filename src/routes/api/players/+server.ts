import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const GET = async ({ url }: RequestEvent) => {
  const idsParam = url.searchParams.get('ids');
  if (!idsParam) {
    return json({ error: 'Anna pelaajien id:t ids-parametrissa' }, { status: 400 });
  }
  const ids = idsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
  if (ids.length === 0) {
    return json([]);
  }
  const result = await sql`
    SELECT id, nick FROM players WHERE id = ANY(${ids})
  `;
  return json(result);
};
