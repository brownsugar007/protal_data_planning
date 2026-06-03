import { json } from '@sveltejs/kit';
import ExcelJS from 'exceljs';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const body = await request.json();
	const workbook = new ExcelJS.Workbook();

	if (body.multiSheet) {
		// Multi-sheet export (OB module)
		for (const [sheetName, rows] of Object.entries(body.multiSheet)) {
			const sheet = workbook.addWorksheet(sheetName.substring(0, 31));
			if (!rows.length) continue;
			addRowsToSheet(sheet, rows);
		}
	} else {
		// Single sheet export
		const { data, sheetName } = body;
		const sheet = workbook.addWorksheet(sheetName || 'Data');
		if (data && data.length) {
			addRowsToSheet(sheet, data);
		}
	}

	const buffer = await workbook.xlsx.writeBuffer();

	return new Response(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="export.xlsx"'
		}
	});
}

/**
 * Add rows to an ExcelJS worksheet with styled headers.
 * @param {ExcelJS.Worksheet} sheet
 * @param {any[]} rows
 */
function addRowsToSheet(sheet, rows) {
	const columns = Object.keys(rows[0]);

	// Set columns
	sheet.columns = columns.map(col => ({
		header: col.toUpperCase().replace(/_/g, ' '),
		key: col,
		width: Math.min(Math.max(col.length + 4, 12), 35)
	}));

	// Add data rows
	for (const row of rows) {
		sheet.addRow(row);
	}

	// Style header row
	const headerRow = sheet.getRow(1);
	headerRow.height = 28;
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF1F4E78' }
		};
		cell.font = {
			color: { argb: 'FFFFFFFF' },
			bold: true,
			size: 11
		};
		cell.alignment = {
			horizontal: 'center',
			vertical: 'middle'
		};
		cell.border = {
			bottom: { style: 'thin', color: { argb: 'FF1F4E78' } }
		};
	});

	// Zebra stripe data rows (limit to 2000 for performance)
	const maxStyleRows = Math.min(rows.length, 2000);
	for (let i = 2; i <= maxStyleRows + 1; i++) {
		if (i % 2 === 0) {
			const row = sheet.getRow(i);
			row.eachCell((cell) => {
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'FFF4F6F9' }
				};
			});
		}
	}

	// Auto-fit column widths based on content
	sheet.columns.forEach((col) => {
		if (!col.key) return;
		let maxLen = col.header ? col.header.length : 10;
		const maxSample = Math.min(rows.length, 100);
		for (let i = 0; i < maxSample; i++) {
			const val = String(rows[i][col.key] ?? '');
			if (val.length > maxLen) maxLen = val.length;
		}
		col.width = Math.min(maxLen + 3, 40);
	});
}
