import os
import json
import time
import subprocess
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

# Configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "schedule.json")
LOG_DIR = os.path.join(BASE_DIR, "logs")
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../.."))

# Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "scheduler.log")),
        logging.StreamHandler()
    ]
)

def run_agent_task(name, agent, args):
    """Executes a specific agent task."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    task_log_path = os.path.join(LOG_DIR, f"{name}_{timestamp}.log")
    
    import shlex
    parsed_args = shlex.split(args)
    
    # Logic for CronMaster Internal Jobs
    if agent == "cronmaster" and parsed_args and parsed_args[0].endswith(".py"):
        script_path = os.path.join(BASE_DIR, parsed_args[0])
        venv_python = os.path.join(BASE_DIR, "venv", "bin", "python3")
        cmd_args = parsed_args[1:]
    else:
        # Standard Agent Logic
        agent_path = os.path.join(PROJECT_ROOT, "agents", agent)
        # Priority: generate.py -> main.py
        script_path = os.path.join(agent_path, "src", "generate.py")
        if not os.path.exists(script_path):
            script_path = os.path.join(agent_path, "src", "main.py")

        venv_python = os.path.join(agent_path, "venv", "bin", "python3")
        cmd_args = parsed_args

    if not os.path.exists(script_path):
        logging.error(f"Task {name} failed: Script not found at {script_path}")
        return

    logging.info(f"[*] Running task: {name} (Script: {script_path})")
    
    python_exe = venv_python if os.path.exists(venv_python) else "python3"
    cmd = [python_exe, script_path] + cmd_args

    try:
        with open(task_log_path, "w") as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, text=True)
        
        if result.returncode == 0:
            logging.info(f"[+] Task {name} completed successfully.")
        else:
            logging.error(f"[-] Task {name} failed with exit code {result.returncode}. check {task_log_path}")
    except Exception as e:
        logging.error(f"Critical failure running task {name}: {e}")

class CronMaster:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.last_config_mtime = 0
        self.current_jobs = {}

    def load_config(self):
        """Loads and applies schedule configuration."""
        try:
            mtime = os.path.getmtime(CONFIG_PATH)
            if mtime <= self.last_config_mtime:
                return
            
            logging.info("Detected change in schedule.json, reloading...")
            with open(CONFIG_PATH, "r") as f:
                config = json.load(f)
            
            # Remove old jobs
            for job_id in list(self.current_jobs.keys()):
                self.scheduler.remove_job(job_id)
                del self.current_jobs[job_id]

            # Add new jobs
            for task in config.get("tasks", []):
                if not task.get("enabled", True):
                    continue
                
                job_id = task["name"]
                self.scheduler.add_job(
                    run_agent_task,
                    CronTrigger.from_crontab(task["cron"]),
                    args=[task["name"], task["agent"], task["args"]],
                    id=job_id
                )
                self.current_jobs[job_id] = task
                logging.info(f"Scheduled task: {job_id} ({task['cron']})")

            self.last_config_mtime = mtime
        except Exception as e:
            logging.error(f"Failed to load config: {e}")

    def run(self):
        self.scheduler.start()
        logging.info("CronMaster Scheduler started.")
        try:
            while True:
                self.load_config()
                time.sleep(10) # Check for config changes every 10s
        except (KeyboardInterrupt, SystemExit):
            self.scheduler.shutdown()

if __name__ == "__main__":
    master = CronMaster()
    master.run()
