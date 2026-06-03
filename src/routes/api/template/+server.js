import { json } from '@sveltejs/kit';
import ExcelJS from 'exceljs';
import { query } from '$lib/server/db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	const type = url.searchParams.get('type');
	const workbook = new ExcelJS.Workbook();

	try {
		if (type === 'hauling' || type === 'transit' || type === 'fuel') {
			const table = type === 'hauling' ? 'coal_hauling' : (type === 'transit' ? 'coal_transit' : 'fuel');
			const sheetName = type === 'hauling' ? 'Timbangan' : (type === 'transit' ? 'Transit' : 'Data Fuel');
			
			const cols = await query(`SHOW COLUMNS FROM ${table}`);
			const headers = cols.map(c => c.Field).filter(f => f !== 'id' && f !== 'created_at' && f !== 'updated_at');
			
			const sheet = workbook.addWorksheet(sheetName);
			sheet.addRow(headers);
			styleHeader(sheet);
		} else if (type === 'ob') {
			const SHEET_MAPPING = {
				'db_ob': 'ob_ob',
				'db_ob Inpit': 'ob_ob_inpit',
				'db_event': 'ob_event',
				'db_Event MGE': 'ob_event_mge',
				'db_problem prodty': 'ob_problem_prodty',
				'Performance Subcont': 'ob_performance_subcont',
				'Weather': 'ob_weather',
				'Freq Weather': 'ob_freq_weather',
				'Volume OB by JS': 'ob_volume_ob_by_js',
				'db_Material': 'ob_material'
			};
			for (const [sheetName, table] of Object.entries(SHEET_MAPPING)) {
				const cols = await query(`SHOW COLUMNS FROM ${table}`);
				const headers = cols.map(c => c.Field).filter(f => f !== 'id' && f !== 'created_at' && f !== 'updated_at');
				const sheet = workbook.addWorksheet(sheetName.substring(0, 31)); // Max 31 chars
				sheet.addRow(headers);
				styleHeader(sheet);
			}
		} else {
			return json({ error: 'Invalid template type' }, { status: 400 });
		}

		const buffer = await workbook.xlsx.writeBuffer();

		return new Response(buffer, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="Template_${type.toUpperCase()}.xlsx"`
			}
		});
	} catch (err) {
		return json({ error: String(err) }, { status: 500 });
	}
}

/**
 * @param {ExcelJS.Worksheet} sheet
 */
function styleHeader(sheet) {
	const row = sheet.getRow(1);
	row.height = 28;
	
	let colCount = 0;
	row.eachCell((cell, colNumber) => {
		colCount++;
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

	// Auto-fit column widths
	for (let i = 1; i <= colCount; i++) {
		const col = sheet.getColumn(i);
		if (row.getCell(i).value) {
			col.width = Math.min(Math.max(String(row.getCell(i).value).length + 4, 15), 35);
		}
	}
}
