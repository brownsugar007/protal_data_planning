import { execute } from './src/lib/server/db.js';

const tables = [
    'ob_ob', 'ob_ob_inpit', 'ob_event', 'ob_event_mge', 'ob_problem_prodty',
    'ob_performance_subcont', 'ob_weather', 'ob_freq_weather', 'ob_volume_ob_by_js', 'ob_material',
    'coal_hauling', 'coal_transit', 'fuel'
];

async function addIndexes() {
    for (const table of tables) {
        try {
            console.log(`Adding index to ${table}...`);
            await execute(`CREATE INDEX idx_date_id ON ${table} (date, id)`);
            console.log(`Success for ${table}`);
        } catch (err) {
            console.log(`Skipped ${table}: ${err.message}`);
        }
    }
    process.exit(0);
}

addIndexes();
