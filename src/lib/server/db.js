import mysql from 'mysql2/promise';
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } from '$env/static/private';

/** @type {mysql.Pool | null} */
let pool = null;

/**
 * Get or create MySQL connection pool (singleton).
 * Equivalent to SQLAlchemy engine in the Streamlit version.
 */
function getPool() {
	if (!pool) {
		pool = mysql.createPool({
			host: DB_HOST,
			port: parseInt(DB_PORT, 10),
			user: DB_USER,
			password: DB_PASSWORD,
			database: DB_NAME,
			waitForConnections: true,
			connectionLimit: 10,
			maxIdle: 5,
			idleTimeout: 60000,
			queueLimit: 0,
			enableKeepAlive: true,
			keepAliveInitialDelay: 10000,
			dateStrings: true
		});
	}
	return pool;
}

/**
 * Execute a SELECT query and return rows.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<any[]>}
 */
export async function query(sql, params = []) {
	const p = getPool();
	const [rows] = await p.execute(sql, params);
	return /** @type {any[]} */ (rows);
}

/**
 * Execute an INSERT/UPDATE/DELETE query.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<{affectedRows: number, insertId: number}>}
 */
export async function execute(sql, params = []) {
	const p = getPool();
	const [result] = await p.execute(sql, params);
	return /** @type {{affectedRows: number, insertId: number}} */ (result);
}

/**
 * Execute a batch INSERT with multiple rows (uses query, not execute, for bulk).
 * @param {string} sql 
 * @param {any[][]} paramsList
 * @returns {Promise<boolean>}
 */
export async function executeMany(sql, paramsList) {
	const p = getPool();
	const conn = await p.getConnection();
	try {
		// Use bulk insert syntax: mysql2 expects the array of arrays to be wrapped in an outer array
		await conn.query(sql, [paramsList]);
		return true;
	} catch (err) {
		console.error('Batch insert error:', err);
		return false;
	} finally {
		conn.release();
	}
}

const distinctCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get distinct values from a column (for filter dropdowns).
 * @param {string} table
 * @param {string} column
 * @returns {Promise<string[]>}
 */
export async function getDistinct(table, column) {
	const key = `${table}:${column}`;
	const cached = distinctCache.get(key);
	if (cached && Date.now() - cached.time < CACHE_TTL) {
		return cached.data;
	}

	const rows = await query(
		`SELECT DISTINCT \`${column}\` FROM \`${table}\` WHERE \`${column}\` IS NOT NULL AND \`${column}\` != '' ORDER BY \`${column}\``
	);
	const data = rows.map((/** @type {any} */ r) => r[column]);
	distinctCache.set(key, { data, time: Date.now() });
	return data;
}
