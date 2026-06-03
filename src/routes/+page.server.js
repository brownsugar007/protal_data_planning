import { query } from '$lib/server/db.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	let lastHauling = 'Belum Tersedia';
	let lastFuel = 'Belum Tersedia';
	let lastOb = 'Belum Tersedia';
	let lastMs = 'Belum Tersedia';
	let haulingYearly = [];
	let fuelYearly = [];
	let haulingDaily = [];
	let fuelDaily = [];
	let obYearly = [];
	let obDaily = [];

	const [
		haulingMax, fuelMax, obMax,
		haulingY, fuelY, obY,
		haulingD, fuelD, obD
	] = await Promise.all([
		query('SELECT MAX(date) as last_date FROM coal_hauling').catch(() => []),
		query('SELECT MAX(date) as last_date FROM fuel').catch(() => []),
		query('SELECT MAX(date) as last_date FROM ob_ob').catch(() => []),
		
		query(`SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(tonage) as total FROM coal_hauling GROUP BY month ORDER BY month DESC LIMIT 12`).catch(() => []),
		query(`SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(refueling) as total FROM fuel GROUP BY month ORDER BY month DESC LIMIT 12`).catch(() => []),
		query(`SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(volume_js) as total FROM ob_volume_ob_by_js GROUP BY month ORDER BY month DESC LIMIT 12`).catch(() => []),

		query(`SELECT date, SUM(tonage) as total FROM coal_hauling WHERE date >= (SELECT DATE_SUB(MAX(date), INTERVAL 30 DAY) FROM coal_hauling) GROUP BY date ORDER BY date ASC`).catch(() => []),
		query(`SELECT date, SUM(refueling) as total FROM fuel WHERE date >= (SELECT DATE_SUB(MAX(date), INTERVAL 30 DAY) FROM fuel) GROUP BY date ORDER BY date ASC`).catch(() => []),
		query(`SELECT date, SUM(volume_js) as total FROM ob_volume_ob_by_js WHERE date >= (SELECT DATE_SUB(MAX(date), INTERVAL 30 DAY) FROM ob_volume_ob_by_js) GROUP BY date ORDER BY date ASC`).catch(() => [])
	]);

	if (haulingMax[0]?.last_date) lastHauling = haulingMax[0].last_date;
	if (fuelMax[0]?.last_date) lastFuel = fuelMax[0].last_date;
	if (obMax[0]?.last_date) lastOb = obMax[0].last_date;

	haulingYearly = haulingY.reverse();
	fuelYearly = fuelY.reverse();
	obYearly = obY.reverse();

	haulingDaily = haulingD;
	fuelDaily = fuelD;
	obDaily = obD;

	// Serialize data for client (convert BigInt/Decimal)
	const serialize = (arr) => arr.map(r => {
		const obj = {};
		for (const [k, v] of Object.entries(r)) {
			obj[k] = typeof v === 'bigint' ? Number(v) : (v !== null && typeof v === 'object' && 'toNumber' in v) ? v.toNumber() : v;
		}
		return obj;
	});

	return {
		lastHauling,
		lastFuel,
		lastOb,
		lastMs,
		haulingYearly: serialize(haulingYearly),
		fuelYearly: serialize(fuelYearly),
		haulingDaily: serialize(haulingDaily),
		fuelDaily: serialize(fuelDaily),
		obYearly: serialize(obYearly),
		obDaily: serialize(obDaily)
	};
}
