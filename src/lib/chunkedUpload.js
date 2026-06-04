import * as XLSX from 'xlsx';

/**
 * Parse an Excel or CSV file on the client side and upload rows in batches.
 * This bypasses Vercel's 4.5MB body limit and 10s function timeout.
 *
 * @param {File} file - The Excel/CSV file to parse
 * @param {object} config - Configuration object
 * @param {string} config.table - Target database table name
 * @param {string[]} config.dbCols - Database column names
 * @param {string} [config.sheetName] - Optional sheet name to read (Excel only)
 * @param {(key: string) => string} [config.normalizeKey] - Optional key normalizer
 * @param {(col: string, value: any) => any} [config.transformValue] - Optional value transformer
 * @param {(row: object) => boolean} [config.filterRow] - Optional row filter
 * @param {number} [config.batchSize=500] - Rows per batch
 * @param {(progress: {sent: number, total: number, percent: number}) => void} [config.onProgress] - Progress callback
 * @returns {Promise<{success: boolean, totalSent: number, errors: string[]}>}
 */
export async function chunkedUpload(file, config) {
	const {
		table,
		dbCols,
		sheetName,
		normalizeKey = (k) => k.toLowerCase().trim().replace(/\s+/g, '_'),
		transformValue = (_col, v) => v,
		filterRow = () => true,
		batchSize = 500,
		onProgress = () => {}
	} = config;

	// Detect file type
	const fileName = file.name.toLowerCase();
	const isCSV = fileName.endsWith('.csv');

	let jsonData;

	if (isCSV) {
		// Parse CSV: read as text, then use XLSX to parse
		const text = await file.text();
		const workbook = XLSX.read(text, { type: 'string', cellDates: true });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
	} else {
		// Parse Excel
		const buffer = await file.arrayBuffer();
		const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
		let sheet;
		if (sheetName) {
			sheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];
		} else {
			sheet = workbook.Sheets[workbook.SheetNames[0]];
		}
		jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
	}

	if (!jsonData.length) {
		return { success: false, totalSent: 0, errors: ['File tidak mengandung data.'] };
	}

	// Normalize and transform rows
	const rows = jsonData.filter(filterRow).map(row => {
		const normalized = {};
		for (const [key, val] of Object.entries(row)) {
			normalized[normalizeKey(key)] = val;
		}
		return dbCols.map(col => {
			let v = normalized[col] ?? null;
			v = transformValue(col, v);
			return v;
		});
	});

	if (!rows.length) {
		return { success: false, totalSent: 0, errors: ['Tidak ada baris valid ditemukan.'] };
	}

	// Send in batches
	const totalRows = rows.length;
	let totalSent = 0;
	const errors = [];

	for (let i = 0; i < totalRows; i += batchSize) {
		const batch = rows.slice(i, i + batchSize);

		try {
			const resp = await fetch('/api/upload-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ table, columns: dbCols, rows: batch })
			});

			if (!resp.ok) {
				const errData = await resp.json().catch(() => ({ error: 'Unknown error' }));
				errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errData.error}`);
			} else {
				totalSent += batch.length;
			}
		} catch (err) {
			errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${err.message}`);
		}

		onProgress({
			sent: totalSent,
			total: totalRows,
			percent: Math.round(((i + batch.length) / totalRows) * 100)
		});
	}

	return {
		success: errors.length === 0,
		totalSent,
		errors
	};
}
