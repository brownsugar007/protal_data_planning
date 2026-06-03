import mysql.connector

DB_CONFIG = {
    "host":     "127.0.0.1",
    "port":     3308,
    "user":     "root",
    "password": "Planning2026@mge",
    "database": "db_planning"
}

TABLES = [
    'ob_ob', 'ob_ob_inpit', 'ob_event', 'ob_event_mge', 'ob_problem_prodty',
    'ob_performance_subcont', 'ob_weather', 'ob_freq_weather', 'ob_volume_ob_by_js', 'ob_material',
    'coal_hauling', 'coal_transit', 'fuel'
]

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    print("Connected to DB.")
    
    for table in TABLES:
        try:
            print(f"Adding index to {table}...")
            cursor.execute(f"CREATE INDEX idx_date_id ON {table} (date, id)")
            print(f"Success for {table}")
        except Exception as e:
            print(f"Skipped {table}: {e}")
            
    conn.commit()
    conn.close()
    print("Done.")
except Exception as e:
    print(f"Error: {e}")
