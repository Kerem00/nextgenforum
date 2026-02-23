import asyncio
import aiohttp
import time
import subprocess
import signal
import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Configuration
FLASK_URL = "http://127.0.0.1:5000/"
FASTAPI_URL = "http://127.0.0.1:8000/"
TOTAL_REQUESTS = 5000
CONCURRENCY = 100

async def fetch(session, url):
    async with session.get(url) as response:
        await response.read()
        return response.status

async def benchmark(url, total_requests, concurrency):
    async with aiohttp.ClientSession() as session:
        tasks = []
        start_time = time.time()
        for _ in range(total_requests):
            tasks.append(fetch(session, url))
            if len(tasks) >= concurrency:
                await asyncio.gather(*tasks)
                tasks = []
        if tasks:
            await asyncio.gather(*tasks)
        end_time = time.time()
    return total_requests / (end_time - start_time)

def run_server(command, port):
    process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)
    time.sleep(2)  # Wait for server to start
    return process

def stop_server(process):
    # On Windows, we might need a more forceful kill for shell=True
    subprocess.call(['taskkill', '/F', '/T', '/PID', str(process.pid)])

async def main():
    results = {}

    print("Benchmarking Flask...")
    flask_process = run_server([sys.executable, "flask_app.py"], 5000)
    try:
        rps = await benchmark(FLASK_URL, TOTAL_REQUESTS, CONCURRENCY)
        results["Flask"] = rps
        print(f"Flask RPS: {rps:.2f}")
    except Exception as e:
        print(f"Flask benchmark failed: {e}")
    finally:
        stop_server(flask_process)

    print("Benchmarking FastAPI...")
    # uvicorn needs to be installed, usually via pip install uvicorn fastapi
    fastapi_process = run_server([sys.executable, "-m", "uvicorn", "fastapi_app:app", "--port", "8000"], 8000)
    try:
        rps = await benchmark(FASTAPI_URL, TOTAL_REQUESTS, CONCURRENCY)
        results["FastAPI"] = rps
        print(f"FastAPI RPS: {rps:.2f}")
    except Exception as e:
        print(f"FastAPI benchmark failed: {e}")
    finally:
        stop_server(fastapi_process)

    # Plotting
    frameworks = list(results.keys())
    rps_values = list(results.values())

    plt.figure(figsize=(10, 6))
    plt.bar(frameworks, rps_values, color=['blue', 'green'])
    plt.xlabel('Framework')
    plt.ylabel('Requests Per Second (RPS)')
    plt.title(f'Flask vs FastAPI Benchmark ({TOTAL_REQUESTS} requests, {CONCURRENCY} concurrency)')
    plt.savefig('benchmark_plot.png')
    print("Plot saved to benchmark_plot.png")

if __name__ == "__main__":
    asyncio.run(main())
