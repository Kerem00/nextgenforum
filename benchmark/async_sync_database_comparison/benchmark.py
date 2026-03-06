import asyncio
import time
import asyncpg
import psycopg
import matplotlib.pyplot as plt

PSYCOPG_DB_ARGS = {
    'user': 'user',
    'password': 'password',
    'dbname': 'benchmark_db',
    'host': '127.0.0.1',
    'port': 5432
}

ASYNCPG_DB_ARGS = {
    'user': 'user',
    'password': 'password',
    'database': 'benchmark_db',
    'host': '127.0.0.1',
    'port': 5432
}

ROW_COUNTS = [100, 1000, 5000, 10000, 50000, 100000]

def sync_psycopg_insert(conn, row_count):
    with conn.cursor() as cur:
        data = [(i, f'name_{i}') for i in range(row_count)]
        query = "INSERT INTO test_table (id, name) VALUES (%s, %s)"
        cur.executemany(query, data)
    conn.commit()

def sync_psycopg_select(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM test_table")
        return cur.fetchall()

async def async_asyncpg_insert(conn, row_count):
    data = [(i, f'name_{i}') for i in range(row_count)]
    query = "INSERT INTO test_table (id, name) VALUES ($1, $2)"
    await conn.executemany(query, data)

async def async_asyncpg_select(conn):
    return await conn.fetch("SELECT * FROM test_table")

def run_psycopg_benchmark():
    insert_times = []
    select_times = []
    
    conn = psycopg.connect(**PSYCOPG_DB_ARGS)
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS test_table")
        cur.execute("CREATE TABLE test_table (id INTEGER, name VARCHAR(50))")
    conn.commit()

    print("Running Psycopg Benchmark...")
    for count in ROW_COUNTS:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE test_table")
        conn.commit()
        
        start = time.time()
        sync_psycopg_insert(conn, count)
        insert_times.append(time.time() - start)
        
        start = time.time()
        sync_psycopg_select(conn)
        select_times.append(time.time() - start)

    conn.close()
    return insert_times, select_times

async def run_asyncpg_benchmark():
    insert_times = []
    select_times = []

    conn = await asyncpg.connect(**ASYNCPG_DB_ARGS)
    await conn.execute("DROP TABLE IF EXISTS test_table")
    await conn.execute("CREATE TABLE test_table (id INTEGER, name VARCHAR(50))")

    print("Running Asyncpg Benchmark...")
    for count in ROW_COUNTS:
        await conn.execute("TRUNCATE test_table")
        
        start = time.time()
        await async_asyncpg_insert(conn, count)
        insert_times.append(time.time() - start)
        
        start = time.time()
        await async_asyncpg_select(conn)
        select_times.append(time.time() - start)

    await conn.close()
    return insert_times, select_times

def main():
    print("Waiting for database to start...")
    time.sleep(5) # Delay just in case it takes a moment to be completely ready
    
    try:
        psy_insert, psy_select = run_psycopg_benchmark()
        async_insert, async_select = asyncio.run(run_asyncpg_benchmark())
        
        # Plotting
        plt.figure(figsize=(12, 6))
        
        plt.subplot(1, 2, 1)
        plt.plot(ROW_COUNTS, psy_insert, label='psycopg', marker='o')
        plt.plot(ROW_COUNTS, async_insert, label='asyncpg', marker='o')
        plt.title('Insert Performance Comparison')
        plt.xlabel('Row Count')
        plt.ylabel('Time (seconds)')
        plt.legend()
        plt.grid(True)
        
        plt.subplot(1, 2, 2)
        plt.plot(ROW_COUNTS, psy_select, label='psycopg', marker='o')
        plt.plot(ROW_COUNTS, async_select, label='asyncpg', marker='o')
        plt.title('Select Performance Comparison')
        plt.xlabel('Row Count')
        plt.ylabel('Time (seconds)')
        plt.legend()
        plt.grid(True)
        
        plt.tight_layout()
        plt.savefig('performance_comparison.png')
        print("Benchmark complete. Results saved to performance_comparison.png")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == '__main__':
    main()
