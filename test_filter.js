import mysql from 'mysql2/promise';

async function test() {
    const conn = await mysql.createConnection({
        host: '103.58.102.44',
        port: 3306,
        user: 'mge_planning',
        password: 'PlanningMGE2026',
        database: 'mge_planning_staging'
    });
    
    let sql = `SELECT date, loading_date FROM coal_hauling WHERE 1=1`;
    const params = [];
    
    let dateStart = '2026-03-11';
    let dateEnd = '2026-03-13';
    
    if (dateStart && dateEnd) {
        sql += ' AND date BETWEEN ? AND ?';
        params.push(dateStart, dateEnd);
    }
    sql += ' ORDER BY date DESC LIMIT 10';
    
    console.log(sql, params);
    const [rows] = await conn.query(sql, params);
    console.log(rows);
    conn.end();
}
test();
