import os
import json
import shutil
import psutil
import subprocess

def get_ai_stats():
    """Captures the output of 'gemini --stats' command."""
    try:
        # Running 'gemini --stats' and stripping ANSI colors
        result = subprocess.run(["gemini", "--stats"], capture_output=True, text=True, timeout=10)
        # Remove ANSI color codes if any
        clean_output = subprocess.run(["sed", "r \"s/\\x1B\\[[0-9;]*[mK]//g\""], input=result.stdout, capture_output=True, text=True).stdout if result.stdout else ""
        if not clean_output:
            clean_output = result.stdout
        return clean_output.strip()
    except Exception as e:
        return f"Could not retrieve AI stats: {str(e)}"

def main():
    # Real Disk Usage for /
    total, used, free = shutil.disk_usage("/")
    
    # System Load Average (1, 5, 15 min)
    try:
        load_avg = os.getloadavg()
    except AttributeError:
        # Fallback for systems where os.getloadavg() isn't available
        load_avg = (0.0, 0.0, 0.0)

    # CPU Usage percentage
    cpu_percent = psutil.cpu_percent(interval=1)

    # Memory Usage
    mem = psutil.virtual_memory()

    # Get AI Stats (API usage, quotas, etc.)
    ai_usage = get_ai_stats()

    result = {
        "status": "REAL_DATA_FROM_PYTHON",
        "disk": {
            "total_gb": round(total / (1024**3), 2),
            "used_gb": round(used / (1024**3), 2),
            "free_gb": round(free / (1024**3), 2),
            "percent": round((used/total)*100, 2)
        },
        "load_avg": load_avg,
        "cpu_usage_percent": cpu_percent,
        "memory": {
            "total_gb": round(mem.total / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "percent": mem.percent
        },
        "ai_stats": ai_usage
    }
    
    # Print human readable summary for the UI, followed by JSON
    summary = f"System Check: CPU {cpu_percent}%, Mem {mem.percent}%, Disk {result['disk']['percent']}% used."
    print(summary)
    
    # Also print AI Stats block for the LLM to see directly
    if ai_usage:
        print("\n--- AI USAGE STATS ---")
        print(ai_usage)
        print("----------------------\n")
        
    print(json.dumps(result))

if __name__ == "__main__":
    main()
