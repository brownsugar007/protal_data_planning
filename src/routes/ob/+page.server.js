import { query, execute, executeMany, getDistinct } from '$lib/server/db.js';
import { fail } from '@sveltejs/kit';
import * as XLSX from 'xlsx';

const OB_TABLES = [
	{ name: 'db_ob', table: 'ob_ob' },
	{ name: 'db_ob Inpit', table: 'ob_ob_inpit' },
	{ name: 'db_event', table: 'ob_event' },
	{ name: 'db_Event MGE', table: 'ob_event_mge' },
	{ name: 'db_problem prodty', table: 'ob_problem_prodty' },
	{ name: 'Performance Subcont', table: 'ob_performance_subcont' },
	{ name: 'Weather', table: 'ob_weather' },
	{ name: 'Freq Weather', table: 'ob_freq_weather' },
	{ name: 'Volume OB by JS', table: 'ob_volume_ob_by_js' },
	{ name: 'db_Material', table: 'ob_material' }
];

const SHEET_MAPPING = {
	'db_ob': 'ob_ob',
	'db_ob inpit': 'ob_ob_inpit',
	'db_event': 'ob_event',
	'db_event mge': 'ob_event_mge',
	'db_problem prodty': 'ob_problem_prodty',
	'performance subcont': 'ob_performance_subcont',
	'weather': 'ob_weather',
	'freq weather': 'ob_freq_weather',
	'volume ob by js': 'ob_volume_ob_by_js',
	'db_material': 'ob_material'
};

const COL_MAPPING = {
	'sub material': 'sub_material',
	'volume adjst by js': 'volume_adjst_by_js',
	'desc.': 'description',
	'start': 'start_time',
	'stop': 'stop_time',
	'desc.lama': 'desc_lama',
	"problem prod'ty": 'problem_prodty',
	"problem prod'ty.lama": 'problem_prodty_lama',
	'pa fmc': 'pa_fmc',
	'volume js': 'volume_js',
	'type material': 'type_material'
};

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const dateStart = url.searchParams.get('date_start') || '';
	const dateEnd = url.searchParams.get('date_end') || '';

	const [pits, shifts, owners] = await Promise.all([
		getDistinct('ob_ob', 'pit').catch(() => []),
		getDistinct('ob_ob', 'shift').catch(() => []),
		getDistinct('ob_ob', 'owner').catch(() => [])
	]);

	const allData = {};
	for (const { name, table } of OB_TABLES) {
		try {
			let sql = `SELECT * FROM ${table} WHERE 1=1`;
			const params = [];
			if (dateStart && dateEnd) {
				sql += ' AND date BETWEEN ? AND ?';
				params.push(dateStart, dateEnd);
			} else if (dateStart) {
				sql += ' AND date = ?';
				params.push(dateStart);
			}
			sql += dateStart ? ' ORDER BY date DESC, id DESC LIMIT 2000' : ' ORDER BY date DESC, id DESC LIMIT 500';
			allData[name] = await query(sql, params);
		} catch {
			allData[name] = [];
		}
	}

	const serialize = (obj) => JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? Number(v) : v));

	return {
		obTables: OB_TABLES.map(t => t.name),
		allData: serialize(allData),
		filters: { pits, shifts, owners },
		dateStart,
		dateEnd
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	upload: async ({ request }) => {
		const formData = await request.formData();
		const file = /** @type {File} */ (formData.get('file'));
		if (!file || file.size === 0) return fail(400, { uploadError: 'File tidak ditemukan.' });

		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

			let successCount = 0;
			const errors = [];

			for (const sheetName of workbook.SheetNames) {
				const sheetLower = sheetName.trim().toLowerCase();
				const tableName = SHEET_MAPPING[sheetLower];
				if (!tableName) {
					errors.push(`Sheet '${sheetName}' tidak dikenali, diabaikan.`);
					continue;
				}

				try {
					const sheet = workbook.Sheets[sheetName];
					const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
					if (!jsonData.length) {
						errors.push(`Sheet '${sheetName}' kosong, dilewati.`);
						continue;
					}

					// Process rows
					const processedRows = jsonData.map(row => {
						const processed = {};
						for (let [key, val] of Object.entries(row)) {
							let colName = key.toLowerCase().trim();
							// Apply column mapping
							if (COL_MAPPING[colName]) colName = COL_MAPPING[colName];
							colName = colName.replace(/ /g, '_').replace(/\./g, '').replace(/'/g, '');

							// Format dates
							if (colName === 'date' && val instanceof Date) {
								const fixed = new Date(val.getTime() + 43200000);
								const y = fixed.getFullYear();
								const m = String(fixed.getMonth() + 1).padStart(2, '0');
								const d = String(fixed.getDate()).padStart(2, '0');
								val = `${y}-${m}-${d}`;
							} else if (val instanceof Date) {
								val = val.toTimeString().split(' ')[0];
							}
							if (val === undefined || val === '') val = null;
							processed[colName] = val;
						}
						return processed;
					});

					const cols = Object.keys(processedRows[0]);
					const safeCols = cols.map(c => `\`${c}\``).join(', ');
					const sql = `INSERT IGNORE INTO ${tableName} (${safeCols}) VALUES ?`;

					const dataToInsert = processedRows.map(row => cols.map(c => row[c] ?? null));

					if (await executeMany(sql, dataToInsert)) {
						successCount++;
					} else {
						errors.push(`Gagal execute batch untuk tabel ${tableName}.`);
					}
				} catch (err) {
					const errStr = String(err.message || err);
					if (errStr.includes('Unknown column')) {
						const match = errStr.match(/Unknown column '(.*?)'/);
						const colName = match ? match[1] : 'yang tidak dikenali';
						errors.push(`❌ Sheet '${sheetName}': Kolom '${colName}' tidak terdaftar di database.`);
					} else {
						errors.push(`Gagal memproses sheet ${sheetName}: ${errStr}`);
					}
				}
			}

			return {
				uploadSuccess: successCount > 0,
				successCount,
				totalSheets: Object.keys(SHEET_MAPPING).length,
				errors
			};
		} catch (err) {
			return fail(500, { uploadError: `Error: ${err.message}` });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const dateStart = formData.get('date_start')?.toString();
		const dateEnd = formData.get('date_end')?.toString();
		const delShift = formData.get('shift')?.toString();

		if (!dateStart) return fail(400, { deleteError: 'Tanggal harus dipilih.' });

		const tablesToDelete = [
			'ob_event', 'ob_event_mge', 'ob_freq_weather', 'ob_ob', 'ob_ob_inpit',
			'ob_performance_subcont', 'ob_problem_prodty', 'ob_volume_ob_by_js', 'ob_weather', 'ob_material'
		];

		let successCount = 0;
		for (const table of tablesToDelete) {
			try {
				let sql = `DELETE FROM ${table} WHERE `;
				const params = [];
				if (dateEnd) {
					sql += 'date BETWEEN ? AND ?';
					params.push(dateStart, dateEnd);
				} else {
					sql += 'date = ?';
					params.push(dateStart);
				}

				if (delShift && delShift !== 'Semua Shift' && delShift !== 'Semua') {
					const cols = await query(`SHOW COLUMNS FROM ${table} LIKE 'shift'`);
					if (cols.length > 0) {
						sql += ' AND shift = ?';
						params.push(delShift);
					}
				}

				await execute(sql, params);
				successCount++;
			} catch {}
		}

		if (successCount === tablesToDelete.length) {
			return { deleteSuccess: true };
		} else {
			return { deleteSuccess: true, partial: true, successCount, total: tablesToDelete.length };
		}
	}
};
