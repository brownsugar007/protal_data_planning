import jwt from 'jsonwebtoken';
import { JWT_SECRET, AUTH_USERNAME, AUTH_PASSWORD } from '$env/static/private';

const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'mge_auth';

/**
 * Validate login credentials.
 * @param {string} username
 * @param {string} password
 * @returns {boolean}
 */
export function validateCredentials(username, password) {
	return username === AUTH_USERNAME && password === AUTH_PASSWORD;
}

/**
 * Create a JWT token.
 * @param {string} username
 * @returns {string}
 */
export function createToken(username) {
	return jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify a JWT token.
 * @param {string} token
 * @returns {{ username: string, role: string } | null}
 */
export function verifyToken(token) {
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		return /** @type {{ username: string, role: string }} */ (decoded);
	} catch {
		return null;
	}
}

export { COOKIE_NAME };
