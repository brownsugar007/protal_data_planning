import { json } from '@sveltejs/kit';
import { executeMany } from '$lib/server/db.js';

/**
 * Chunked batch upload API.
 * Receives pre-parsed rows (JSON) from the client and inserts them in batches.
 * This avoids Vercel's file upload size limit and function timeout.
 */
export async function POST({ request }) {
	try {
		const { table, columns, rows } = await request.json();

		if (!table || !columns || !rows || !rows.length) {
			return json({ error: 'Data batch kosong.' }, { status: 400 });
		}

		// Whitelist allowed tables
		const allowedTables = ['fuel', 'coal_hauling', 'coal_transit',
			'ob_ob', 'ob_ob_inpit', 'ob_event', 'ob_event_mge',
			'ob_problem_prodty', 'ob_performance_subcont', 'ob_weather',
			'ob_freq_weather', 'ob_volume_ob_by_js', 'ob_material'];
		
		if (!allowedTables.includes(table)) {
			return json({ error: `Tabel '${table}' tidak diizinkan.` }, { status: 400 });
		}

		const safeCols = columns.map(c => `\`${c}\``).join(', ');
		const sql = `INSERT IGNORE INTO \`${table}\` (${safeCols}) VALUES ?`;

		const success = await executeMany(sql, rows);
		if (!success) {
			return json({ error: 'Gagal menyimpan batch ke database.' }, { status: 500 });
		}

		return json({ success: true, rowCount: rows.length });
	} catch (err) {
		console.error('Batch upload error:', err);
		return json({ error: `Server error: ${err.message}` }, { status: 500 });
	}
}
