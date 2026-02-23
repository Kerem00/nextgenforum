
import time
import mysql.connector
import psycopg2
import matplotlib.pyplot as plt
import numpy as np

# Configuration
DB_HOST = "localhost"
DB_USER = "user"
DB_PASSWORD = "password"
DB_NAME = "benchmark_db"
ITERATIONS = 1000  # Number of operations for benchmark

def get_mariadb_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=3306
    )

def get_postgres_connection():
    return psycopg2.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        port=5432
    )

def benchmark_db(name, get_connection_func, placeholder_style):
    print(f"\n--- Benchmarking {name} ---")
    results = {}
    try:
        conn = get_connection_func()
        cursor = conn.cursor()
        
        # Setup
        cursor.execute("DROP TABLE IF EXISTS benchmark_test")
        if name == "MariaDB":
             cursor.execute("""
                CREATE TABLE benchmark_test (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    data VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        else:
             cursor.execute("""
                CREATE TABLE benchmark_test (
                    id SERIAL PRIMARY KEY,
                    data VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        conn.commit()

        # INSERT
        start_time = time.time()
        for i in range(ITERATIONS):
            cursor.execute(f"INSERT INTO benchmark_test (data) VALUES ({placeholder_style})", (f"data_{i}",))
        conn.commit()
        results['Insert'] = time.time() - start_time
        print(f"INSERT {ITERATIONS} records: {results['Insert']:.4f} seconds")

        # SELECT
        start_time = time.time()
        for i in range(ITERATIONS):
            cursor.execute(f"SELECT * FROM benchmark_test WHERE id = {placeholder_style}", (i + 1,))
            cursor.fetchall()
        results['Select'] = time.time() - start_time
        print(f"SELECT {ITERATIONS} records: {results['Select']:.4f} seconds")

        # UPDATE
        start_time = time.time()
        for i in range(ITERATIONS):
            cursor.execute(f"UPDATE benchmark_test SET data = {placeholder_style} WHERE id = {placeholder_style}", (f"updated_{i}", i + 1))
        conn.commit()
        results['Update'] = time.time() - start_time
        print(f"UPDATE {ITERATIONS} records: {results['Update']:.4f} seconds")

        # DELETE
        start_time = time.time()
        for i in range(ITERATIONS):
            cursor.execute(f"DELETE FROM benchmark_test WHERE id = {placeholder_style}", (i + 1,))
        conn.commit()
        results['Delete'] = time.time() - start_time
        print(f"DELETE {ITERATIONS} records: {results['Delete']:.4f} seconds")

        # Cleanup
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error benchmarking {name}: {e}")
        return None

    return results

def plot_results(mariadb_results, postgres_results):
    labels = list(mariadb_results.keys())
    mariadb_times = list(mariadb_results.values())
    postgres_times = list(postgres_results.values())

    x = np.arange(len(labels))  # the label locations
    width = 0.35  # the width of the bars

    fig, ax = plt.subplots(figsize=(10, 6))
    rects1 = ax.bar(x - width/2, mariadb_times, width, label='MariaDB')
    rects2 = ax.bar(x + width/2, postgres_times, width, label='PostgreSQL')

    # Add some text for labels, title and custom x-axis tick labels, etc.
    ax.set_ylabel('Time (seconds)')
    ax.set_title(f'Database Benchmark Results ({ITERATIONS} iterations)')
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.legend()

    ax.bar_label(rects1, padding=3, fmt='%.2f')
    ax.bar_label(rects2, padding=3, fmt='%.2f')

    fig.tight_layout()
    plt.savefig('benchmark_results.png')
    print("\nPlot saved to benchmark_results.png")

if __name__ == "__main__":
    print("Waiting for databases to initialize...")
    time.sleep(5) 
    
    mariadb_res = benchmark_db("MariaDB", get_mariadb_connection, "%s")
    postgres_res = benchmark_db("PostgreSQL", get_postgres_connection, "%s")

    if mariadb_res and postgres_res:
        plot_results(mariadb_res, postgres_res)

