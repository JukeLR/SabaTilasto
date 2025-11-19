import { json, type RequestEvent } from '@sveltejs/kit';
import { sql } from '$lib/db';

export const GET = async ({ url }: RequestEvent) => {
  const teamId = url.searchParams.get('team_id');
  const position = url.searchParams.get('position');
  const notPosition = url.searchParams.get('not_position');
  // Rakennetaan dynaaminen SQL-lauseke
  let where: string[] = [];
  let values: any[] = [];
  if (teamId) {
    where.push(`team_ids @> ARRAY[${parseInt(teamId)}]`);
  }
  if (position) {
    where.push(`position = '${position}'`);
  }
  if (notPosition) {
    where.push(`position != '${notPosition}'`);
  }
  let sqlQuery = `SELECT id, first_name, last_name, nick, position FROM players`;
  if (where.length > 0) {
    sqlQuery += ' WHERE ' + where.join(' AND ');
  }
  const result = await sql.query(sqlQuery);
  let players = Array.isArray(result) ? result : (result.rows || []);
  let rowCount = Array.isArray(players) ? players.length : 0;
  return json({
    players,
    debug: {
      sql: sqlQuery,
      rowCount
    }
  });
};
