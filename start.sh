#!/bin/bash

# Ensure logs directory exists
mkdir -p logs agents/claw_proxy/logs

echo "--- Starting GenieBot (Bridge-03) ---"

# 0. Start the ClawProxy (Token-Blind Sidecar)
echo "[0/4] Launching ClawProxy..."
./agents/claw_proxy/venv/bin/python3 agents/claw_proxy/src/main.py > agents/claw_proxy/logs/proxy.log 2>&1 &
PROXY_PID=$!

# 1. Start the Node.js AI Daemon
echo "[1/4] Launching AI Daemon..."
node gateway/src/daemon.js > logs/daemon.log 2>&1 &
DAEMON_PID=$!

# 2. Start the Telegram Bridge
echo "[2/4] Launching Telegram Bridge..."
./venv/bin/python3 gateway/telegram_bridge.py > logs/bridge.log 2>&1 &
BRIDGE_PID=$!

# 3. Start the CronMaster Scheduler
echo "[3/4] Launching CronMaster Scheduler..."
./agents/cronmaster/venv/bin/python3 agents/cronmaster/src/main.py > agents/cronmaster/logs/scheduler.log 2>&1 &
CRON_PID=$!

# Define cleanup function
cleanup() {
    echo ""
    echo "--- Shutting down GenieBot ---"
    echo "Killing ClawProxy (PID: $PROXY_PID)..."
    kill $PROXY_PID
    echo "Killing AI Daemon (PID: $DAEMON_PID)..."
    kill $DAEMON_PID
    echo "Killing Telegram Bridge (PID: $BRIDGE_PID)..."
    kill $BRIDGE_PID
    echo "Killing CronMaster (PID: $CRON_PID)..."
    kill $CRON_PID
    exit
}

# Trap Ctrl+C (SIGINT) and exit (SIGTERM)
trap cleanup SIGINT SIGTERM

echo "[4/4] Starting Master Engine..."
echo "---------------------------------------"

# Start the Master Engine in the foreground
./venv/bin/python3 master.py

# When master.py finishes, also cleanup
cleanup
