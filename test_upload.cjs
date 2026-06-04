const XLSX = require('xlsx');
const fs = require('fs');
const file = 'd:\\File Kerja\\project server\\Template_FUEL (1).xlsx';
const buffer = fs.readFileSync(file);
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
let sheet = workbook.Sheets['fuel'] || workbook.Sheets[workbook.SheetNames[0]];

const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
console.log('Total JSON rows:', jsonData.length);

const dbCols = ['unit_fix', 'date', 'periode', 'shift', 'time', 'reg_no', 'unit_code', 'unit_model', 'unit_type', 'brand', 'vendor', 'alocation', 'km', 'hm', 'fm_awal', 'fm_akhir', 'refueling', 'source', 'location', 'operator', 'fuelman', 'no_voucher'];

const normalize = (s) => {
    let n = String(s).toLowerCase().trim().replace(/\s+/g, '_');
    if (n === 'unit_code_fix') n = 'unit_fix';
    return n;
};

const rows = jsonData.filter(row => {
    const keys = Object.keys(row).map(normalize);
    return keys.includes('no_voucher') || keys.includes('unit_code');
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

console.log('Valid rows for DB:', rows.length);
if (rows.length > 0) {
    let count2 = 0;
    for (const r of rows) {
        if (r[1] === '2026-06-02') count2++;
    }
    console.log('Rows with date 2026-06-02:', count2);
    
    // Check if there are other dates
    const dateCounts = {};
    for (const r of rows) {
        dateCounts[r[1]] = (dateCounts[r[1]] || 0) + 1;
    }
    console.log('Date distribution:', dateCounts);
}
