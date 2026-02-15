# CronMaster Agent (Infrastructure)

## 1. Agent Overview
**Purpose**: Centralized task scheduler for GenieBot agents. Manages recurring tasks like system health checks, data syncing, or automated posting.
**Core**: Powered by `APScheduler` with hot-reloading support for configurations.

## 2. Configuration (`config/schedule.json`)
To add or modify tasks, edit the `config/schedule.json` file. The scheduler will automatically reload changes within 10 seconds.

**Format**:
```json
{
    "tasks": [
        {
            "name": "unique_task_name",
            "agent": "target_agent_directory_name",
            "args": "--optional --arguments",
            "cron": "*/5 * * * *", 
            "enabled": true
        }
    ]
}
```

## 3. Monitoring
- **Scheduler Heartbeat**: Check `logs/scheduler.log` for job scheduling and reload status.
- **Task Execution**: Each execution of a task is logged separately in `logs/<task_name>_<timestamp>.log`.
- **Status Markers**: Use standard project monitoring tools to check the `cronmaster` process.

## 4. Usage
```bash
# Start the scheduler
venv/bin/python3 src/main.py
```

## 5. Deployment Mandate
This agent should ideally run as a persistent daemon to ensure continuous scheduling.
