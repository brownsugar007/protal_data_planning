import { validateCredentials, createToken, COOKIE_NAME } from '$lib/server/auth.js';
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!username || !password) {
			return fail(400, { error: 'Username dan password harus diisi.', username });
		}

		if (!validateCredentials(username, password)) {
			return fail(401, { error: 'Username atau password salah.', username });
		}

		const token = createToken(username);
		cookies.set(COOKIE_NAME, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		throw redirect(303, '/');
	}
};
