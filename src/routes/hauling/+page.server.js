import { query, execute, executeMany, getDistinct } from '$lib/server/db.js';
import { fail } from '@sveltejs/kit';
import * as XLSX from 'xlsx';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	const dateStart = url.searchParams.get('date_start') || '';
	const dateEnd = url.searchParams.get('date_end') || '';
	const subModule = url.searchParams.get('sub') || 'hauling';

	// Fetch filter options
	const [vendors, unitTypes, pits, transitPits, transitDiggers, transitUnits] = await Promise.all([
		getDistinct('coal_hauling', 'vendor').catch(() => []),
		getDistinct('coal_hauling', 'unit_type').catch(() => []),
		getDistinct('coal_hauling', 'pit').catch(() => []),
		getDistinct('coal_transit', 'pit').catch(() => []),
		getDistinct('coal_transit', 'digger').catch(() => []),
		getDistinct('coal_transit', 'unit_code').catch(() => [])
	]);

	// Fetch hauling data
	let haulingData = [];
	let transitData = [];

	if (subModule === 'hauling' || !subModule) {
		let sql = `SELECT jml, day, date, shift, loading_date, voucher_number, pit, block, seam, product, concat, vendor, unit_type, unit_id, payload_arrival_time, payload_embark_time, weight_gross, weight_empty, weight_nett, destination, route, loader_id, tonage FROM coal_hauling WHERE 1=1`;
		const params = [];

		if (dateStart && dateEnd) {
			sql += ' AND date BETWEEN ? AND ?';
			params.push(dateStart, dateEnd);
		} else if (dateStart) {
			sql += ' AND date = ?';
			params.push(dateStart);
		}

		sql += dateStart ? ' ORDER BY date DESC LIMIT 5000' : ' ORDER BY date DESC LIMIT 2000';
		haulingData = await query(sql, params).catch(() => []);
	}

	if (subModule === 'transit') {
		let sql = `SELECT id, date, shift, unit_code, model, type, brand, user, seam, block, product_code, product_inv, pit, digger, \`1\`, \`2\`, \`3\`, \`4\`, \`5\`, \`6\`, \`7\`, \`8\`, \`9\`, \`10\`, \`11\`, \`12\`, total, vessel, netto, periode, room FROM coal_transit WHERE 1=1`;
		const params = [];

		if (dateStart && dateEnd) {
			sql += ' AND date BETWEEN ? AND ?';
			params.push(dateStart, dateEnd);
		} else if (dateStart) {
			sql += ' AND date = ?';
			params.push(dateStart);
		}

		sql += dateStart ? ' ORDER BY date DESC LIMIT 5000' : ' ORDER BY date DESC LIMIT 2000';
		transitData = await query(sql, params).catch(() => []);
	}

	// Serialize for client (handle potential BigInt/Decimal)
	const serialize = (arr) => JSON.parse(JSON.stringify(arr, (_, v) => typeof v === 'bigint' ? Number(v) : v));

	return {
		haulingData: serialize(haulingData),
		transitData: serialize(transitData),
		filters: { vendors, unitTypes, pits, transitPits, transitDiggers, transitUnits },
		subModule,
		dateStart,
		dateEnd
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	uploadHauling: async ({ request }) => {
		const formData = await request.formData();
		const file = /** @type {File} */ (formData.get('file'));
		if (!file || file.size === 0) return fail(400, { uploadError: 'File tidak ditemukan.' });

		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
			
			let sheet = workbook.Sheets['Timbangan'];
			let headerRow = 3;
			if (!sheet) {
				sheet = workbook.Sheets[workbook.SheetNames[0]];
				headerRow = 0;
			}

			const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRow, defval: null });
			if (!jsonData.length) return fail(400, { uploadError: 'File tidak mengandung data.' });

			const dbCols = ['jml', 'day', 'date', 'shift', 'loading_date', 'voucher_number', 'pit', 'block', 'seam', 'product', 'concat', 'vendor', 'unit_type', 'unit_id', 'payload_arrival_time', 'payload_embark_time', 'weight_gross', 'weight_empty', 'weight_nett', 'destination', 'route', 'loader_id', 'tonage'];

			// Normalize column names
			const normalize = (s) => String(s).toLowerCase().trim().replace(/\s+/g, '_');

			const rows = jsonData.filter(row => {
				const keys = Object.keys(row).map(normalize);
				return keys.includes('voucher_number') && row[Object.keys(row).find(k => normalize(k) === 'voucher_number')] != null;
			}).map(row => {
				const normalized = {};
				for (const [key, val] of Object.entries(row)) {
					normalized[normalize(key)] = val;
				}
				return dbCols.map(col => {
					let v = normalized[col] ?? null;
					if ((col === 'date' || col === 'loading_date') && v instanceof Date) {
						const fixed = new Date(v.getTime() + 43200000);
						const y = fixed.getFullYear();
						const m = String(fixed.getMonth() + 1).padStart(2, '0');
						const d = String(fixed.getDate()).padStart(2, '0');
						v = `${y}-${m}-${d}`;
					}
					if ((col === 'payload_arrival_time' || col === 'payload_embark_time') && v instanceof Date) {
						v = v.toTimeString().split(' ')[0];
					}
					// Fix for weights uploaded in kg instead of tons
					if ((col === 'weight_gross' || col === 'weight_empty' || col === 'weight_nett') && typeof v === 'number' && v >= 1000) {
						v = v / 1000;
					}
					return v;
				});
			});

			if (!rows.length) return fail(400, { uploadError: 'Tidak ada baris valid (voucher_number kosong).' });

			const colStr = dbCols.join(', ');
			const sql = `INSERT IGNORE INTO coal_hauling (${colStr}) VALUES ?`;

			const success = await executeMany(sql, rows);
			if (!success) return fail(500, { uploadError: 'Gagal menyimpan data ke database.' });

			return { uploadSuccess: true, rowCount: rows.length };
		} catch (err) {
			return fail(500, { uploadError: `Error: ${err.message}` });
		}
	},

	uploadTransit: async ({ request }) => {
		const formData = await request.formData();
		const file = /** @type {File} */ (formData.get('file'));
		if (!file || file.size === 0) return fail(400, { uploadError: 'File tidak ditemukan.' });

		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

			let sheet = workbook.Sheets['Transit'] || workbook.Sheets[workbook.SheetNames[0]];

			// Auto-detect header row (find row with 'unit' and 'digger')
			const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
			let headerIdx = 0;
			for (let i = 0; i < Math.min(rawData.length, 10); i++) {
				const rowStr = rawData[i].map(x => String(x).toLowerCase()).join(' ');
				if (rowStr.includes('unit') && rowStr.includes('digger')) {
					headerIdx = i;
					break;
				}
			}

			const headers = rawData[headerIdx].map(h => String(h).toLowerCase().trim().replace(/\s+/g, '_'));
			const dataRows = rawData.slice(headerIdx + 1);

			const dbCols = ['date', 'shift', 'unit_code', 'model', 'type', 'brand', 'user', 'seam', 'block', 'product_code', 'product_inv', 'pit', 'digger', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'total', 'vessel', 'netto', 'periode', 'room'];

			const rows = dataRows.filter(row => {
				const dateIdx = headers.indexOf('date');
				const unitIdx = headers.indexOf('unit_code');
				return (dateIdx >= 0 && row[dateIdx] != null) || (unitIdx >= 0 && row[unitIdx] != null);
			}).map(row => {
				return dbCols.map(col => {
					const idx = headers.indexOf(col);
					if (idx < 0) return null;
					let v = row[idx] ?? null;
					if (col === 'date' && v instanceof Date) {
						const fixed = new Date(v.getTime() + 43200000);
						const y = fixed.getFullYear();
						const m = String(fixed.getMonth() + 1).padStart(2, '0');
						const d = String(fixed.getDate()).padStart(2, '0');
						v = `${y}-${m}-${d}`;
					}
					return v;
				});
			});

			if (!rows.length) return fail(400, { uploadError: 'Tidak ada baris valid.' });

			const colStr = dbCols.join(', ');
			const sql = `INSERT IGNORE INTO coal_transit (${colStr}) VALUES ?`;

			const success = await executeMany(sql, rows);
			if (!success) return fail(500, { uploadError: 'Gagal menyimpan data Transit.' });

			return { uploadSuccess: true, rowCount: rows.length, transit: true };
		} catch (err) {
			return fail(500, { uploadError: `Error Transit: ${err.message}` });
		}
	},

	deleteHauling: async ({ request }) => {
		const formData = await request.formData();
		const dateStart = formData.get('date_start')?.toString();
		const dateEnd = formData.get('date_end')?.toString();
		const shift = formData.get('shift')?.toString();

		if (!dateStart) return fail(400, { deleteError: 'Tanggal harus dipilih.' });

		let sql = 'DELETE FROM coal_hauling WHERE ';
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
	},

	deleteTransit: async ({ request }) => {
		const formData = await request.formData();
		const dateStart = formData.get('date_start')?.toString();
		const dateEnd = formData.get('date_end')?.toString();
		const shift = formData.get('shift')?.toString();

		if (!dateStart) return fail(400, { deleteError: 'Tanggal harus dipilih.' });

		let sql = 'DELETE FROM coal_transit WHERE ';
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
			return { deleteSuccess: true, transit: true };
		} catch (err) {
			return fail(500, { deleteError: `Gagal menghapus Transit: ${err.message}` });
		}
	}
};
