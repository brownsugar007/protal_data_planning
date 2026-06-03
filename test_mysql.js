import mysql from 'mysql2/promise';

async function test() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3308,
        user: 'root',
        password: 'Planning2026@mge',
        database: 'db_planning'
    });
    const [rows] = await conn.query('SELECT weight_gross, weight_empty, weight_nett, tonage FROM coal_hauling ORDER BY id DESC LIMIT 5');
    console.log(rows);
    console.log(typeof rows[0].weight_gross);
    conn.end();
}
test();
