import { verifyToken, COOKIE_NAME } from '$lib/server/auth.js';
import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const token = event.cookies.get(COOKIE_NAME);
	const isLoginPage = event.url.pathname === '/login';
	const isApiRoute = event.url.pathname.startsWith('/api/');

	if (token) {
		const user = verifyToken(token);
		if (user) {
			event.locals.user = user;
			// If user is logged in and tries to access login page, redirect to dashboard
			if (isLoginPage) {
				throw redirect(302, '/');
			}
		} else {
			// Token invalid, clear it
			event.cookies.delete(COOKIE_NAME, { path: '/' });
			if (!isLoginPage && !isApiRoute) {
				throw redirect(302, '/login');
			}
		}
	} else {
		// No token
		if (!isLoginPage && !isApiRoute) {
			throw redirect(302, '/login');
		}
	}

	const response = await resolve(event);
	return response;
}
