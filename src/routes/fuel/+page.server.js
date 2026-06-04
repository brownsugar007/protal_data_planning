import { query, execute, executeMany, getDistinct } from '$lib/server/db.js';
import { fail } from '@sveltejs/kit';
import * as XLSX from 'xlsx';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const dateStart = url.searchParams.get('date_start') || '';
	const dateEnd = url.searchParams.get('date_end') || '';

	const [vendors, units, sources] = await Promise.all([
		getDistinct('fuel', 'vendor').catch(() => []),
		getDistinct('fuel', 'unit_code').catch(() => []),
		getDistinct('fuel', 'source').catch(() => [])
	]);

	let sql = `SELECT id, unit_fix, date, periode, shift, time, reg_no, unit_code, unit_model, unit_type, brand, vendor, alocation, km, hm, fm_awal, fm_akhir, refueling, source, location, operator, fuelman, no_voucher FROM fuel WHERE 1=1`;
	const params = [];

	if (dateStart && dateEnd) {
		sql += ' AND date BETWEEN ? AND ?';
		params.push(dateStart, dateEnd);
	} else if (dateStart) {
		sql += ' AND date = ?';
		params.push(dateStart);
	}

	sql += dateStart ? ' ORDER BY date DESC, id DESC' : ' ORDER BY date DESC, id DESC LIMIT 2000';

	let fuelData = await query(sql, params).catch(() => []);

	const serialize = (arr) => JSON.parse(JSON.stringify(arr, (_, v) => typeof v === 'bigint' ? Number(v) : v));

	return {
		fuelData: serialize(fuelData),
		filters: { vendors, units, sources },
		dateStart,
		dateEnd
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	upload: async ({ request }) => {
		console.log('UPLOAD ACTION TRIGGERED for FUEL');
		const formData = await request.formData();
		const file = /** @type {File} */ (formData.get('file'));
		if (!file || file.size === 0) {
			console.log('No file provided');
			return fail(400, { uploadError: 'File tidak ditemukan.' });
		}

		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
			let sheet = workbook.Sheets['fuel'] || workbook.Sheets[workbook.SheetNames[0]];

			const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
			if (!jsonData.length) return fail(400, { uploadError: 'File tidak mengandung data.' });

			const dbCols = ['unit_fix', 'date', 'periode', 'shift', 'time', 'reg_no', 'unit_code', 'unit_model', 'unit_type', 'brand', 'vendor', 'alocation', 'km', 'hm', 'fm_awal', 'fm_akhir', 'refueling', 'source', 'location', 'operator', 'fuelman', 'no_voucher'];
			const normalize = (s) => {
				let n = String(s).toLowerCase().trim().replace(/\s+/g, '_');
				if (n === 'unit_code_fix') n = 'unit_fix';
				return n;
			};

			const rows = jsonData.filter(row => {
				const keys = Object.keys(row).map(normalize);
				const voucher = keys.includes('no_voucher') || keys.includes('unit_code');
				return voucher;
			}).map(row => {
				const normalized = {};
				for (const [key, val] of Object.entries(row)) {
					normalized[normalize(key)] = val;
				}
				return dbCols.map(col => {
					let v = normalized[col] ?? null;
					if (col === 'date' && v instanceof Date) {
						const y = v.getFullYear();
						const m = String(v.getMonth() + 1).padStart(2, '0');
						const d = String(v.getDate()).padStart(2, '0');
						v = `${y}-${m}-${d}`;
					}
					if (col === 'time' && v instanceof Date) v = v.toTimeString().split(' ')[0];
					return v;
				});
			});

			if (!rows.length) return fail(400, { uploadError: 'Tidak ada baris valid.' });

			const sql = `INSERT IGNORE INTO fuel (${dbCols.join(', ')}) VALUES ?`;

			const success = await executeMany(sql, rows);
			if (!success) return fail(500, { uploadError: 'Gagal menyimpan data Fuel.' });

			return { uploadSuccess: true, rowCount: rows.length };
		} catch (err) {
			return fail(500, { uploadError: `Error: ${err.message}` });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const dateStart = formData.get('date_start')?.toString();
		const dateEnd = formData.get('date_end')?.toString();
		const shift = formData.get('shift')?.toString();

		if (!dateStart) return fail(400, { deleteError: 'Tanggal harus dipilih.' });

		let sql = 'DELETE FROM fuel WHERE ';
		const params = [];

		if (dateEnd) {
			sql += 'date BETWEEN ? AND ?';
			params.push(dateStart, dateEnd);
		} else {
			sql += 'date = ?';
			params.push(dateStart);
		}

		if (shift && shift !== 'Semua') {
			sql += ' AND shift = ?';
			params.push(shift);
		}

		try {
			await execute(sql, params);
			return { deleteSuccess: true };
		} catch (err) {
			return fail(500, { deleteError: `Gagal menghapus: ${err.message}` });
		}
	}
};
