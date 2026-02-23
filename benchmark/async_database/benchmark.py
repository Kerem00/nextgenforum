import asyncio
import time
import asyncmy
import asyncpg
import matplotlib.pyplot as plt
import pandas as pd
import os

# Configuration
MYSQL_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'benchmark_user',
    'password': 'benchmark_password',
    'db': 'benchmark_db',
    'autocommit': True
}

POSTGRES_CONFIG = {
    'host': '127.0.0.1',
    'port': 5432,
    'user': 'benchmark_user',
    'password': 'benchmark_password',
    'database': 'benchmark_db'
}

TABLE_SCHEMA_MYSQL = """
CREATE TABLE IF NOT EXISTS performance_test (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data TEXT
);
"""

TABLE_SCHEMA_POSTGRES = """
CREATE TABLE IF NOT EXISTS performance_test (
    id SERIAL PRIMARY KEY,
    data TEXT
);
"""

ROW_COUNT = 10000
BATCH_SIZE = 1000
DATA_PAYLOAD = "x" * 100

results = []

async def benchmark_mysql():
    print("Benchmarking MySQL...")
    conn = await asyncmy.connect(**MYSQL_CONFIG)
    async with conn.cursor() as cursor:
        await cursor.execute("DROP TABLE IF EXISTS performance_test")
        await cursor.execute(TABLE_SCHEMA_MYSQL)
        
        # INSERT Benchmark
        print("  Running INSERT benchmark...")
        start_time = time.time()
        data = [(DATA_PAYLOAD,) for _ in range(ROW_COUNT)]
        await cursor.executemany("INSERT INTO performance_test (data) VALUES (%s)", data)
        end_time = time.time()
        insert_duration = end_time - start_time
        insert_rps = ROW_COUNT / insert_duration
        print(f"  INSERT: {insert_rps:.2f} rows/sec")

        # SELECT Benchmark
        print("  Running SELECT benchmark...")
        start_time = time.time()
        await cursor.execute("SELECT * FROM performance_test")
        await cursor.fetchall()
        end_time = time.time()
        select_duration = end_time - start_time
        select_rps = ROW_COUNT / select_duration
        print(f"  SELECT: {select_rps:.2f} rows/sec")
        
        results.append({'Database': 'MySQL', 'Operation': 'INSERT', 'Rows/Sec': insert_rps})
        results.append({'Database': 'MySQL', 'Operation': 'SELECT', 'Rows/Sec': select_rps})

    conn.close()

async def benchmark_postgres():
    print("Benchmarking PostgreSQL...")
    conn = await asyncpg.connect(**POSTGRES_CONFIG)
    
    await conn.execute("DROP TABLE IF EXISTS performance_test")
    await conn.execute(TABLE_SCHEMA_POSTGRES)

    # INSERT Benchmark
    print("  Running INSERT benchmark...")
    start_time = time.time()
    data = [(DATA_PAYLOAD,) for _ in range(ROW_COUNT)]
    await conn.executemany("INSERT INTO performance_test (data) VALUES ($1)", data)
    end_time = time.time()
    insert_duration = end_time - start_time
    insert_rps = ROW_COUNT / insert_duration
    print(f"  INSERT: {insert_rps:.2f} rows/sec")

    # SELECT Benchmark
    print("  Running SELECT benchmark...")
    start_time = time.time()
    await conn.fetch("SELECT * FROM performance_test")
    end_time = time.time()
    select_duration = end_time - start_time
    select_rps = ROW_COUNT / select_duration
    print(f"  SELECT: {select_rps:.2f} rows/sec")

    results.append({'Database': 'PostgreSQL', 'Operation': 'INSERT', 'Rows/Sec': insert_rps})
    results.append({'Database': 'PostgreSQL', 'Operation': 'SELECT', 'Rows/Sec': select_rps})

    await conn.close()

def plot_results():
    df = pd.DataFrame(results)
    
    # Pivot for plotting
    pivot_df = df.pivot(index='Operation', columns='Database', values='Rows/Sec')
    
    ax = pivot_df.plot(kind='bar', figsize=(10, 6), rot=0)
    plt.title('MySQL vs PostgreSQL Performance (Async Drivers)')
    plt.ylabel('Rows Per Second')
    plt.xlabel('Operation')
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig('benchmark_results.png')
    print("Plot saved to benchmark_results.png")

async def main():
    # Wait for DBs to be ready (naive wait)
    print("Waiting for databases to initialize...")
    await asyncio.sleep(10) 
    
    try:
        await benchmark_mysql()
    except Exception as e:
        print(f"MySQL Benchmark failed: {e}")

    try:
        await benchmark_postgres()
    except Exception as e:
        print(f"PostgreSQL Benchmark failed: {e}")
        
    plot_results()

if __name__ == "__main__":
    asyncio.run(main())
