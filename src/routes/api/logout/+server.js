import { COOKIE_NAME } from '$lib/server/auth.js';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies }) {
	cookies.delete(COOKIE_NAME, { path: '/' });
	return json({ success: true });
}
