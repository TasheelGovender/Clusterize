import psutil
import time

with open("resource_usage.csv", "w") as f:
    f.write("timestamp,cpu_percent,mem_percent\n")
    for _ in range(120):  # 10 minutes at 5s intervals
        cpu = psutil.cpu_percent()
        mem = psutil.virtual_memory().percent
        f.write(f"{time.time()},{cpu},{mem}\n")
        time.sleep(5)