import os
import json
import subprocess
import time
import re
from datetime import datetime
from dotenv import load_dotenv

# Configuration
PROJECT_ROOT = "/etc/myapp/geniebot"
AGENT_ROOT = os.path.join(PROJECT_ROOT, "agents/evolver")
READER_AGENT_PATH = os.path.join(PROJECT_ROOT, "agents/reader_agent/venv/bin/python3")
READER_AGENT_SRC = os.path.join(PROJECT_ROOT, "agents/reader_agent/src/main.py")
HISTORY_FILE = os.path.join(AGENT_ROOT, "memory/history.md")
PROPOSAL_DIR = os.path.join(AGENT_ROOT, "output/proposals")
CONFIG_PATH = os.path.join(AGENT_ROOT, "config/sources.json")
CONSTRAINTS_PATH = os.path.join(AGENT_ROOT, "config/constraints.json")

def call_reader(url):
    """Uses reader_agent to fetch page content."""
    try:
        cmd = [READER_AGENT_PATH, READER_AGENT_SRC, "--url", url]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if "PAGE_CONTENT_START" in result.stdout:
            match = re.search(r"PAGE_CONTENT_START(.*?)PAGE_CONTENT_END", result.stdout, re.DOTALL)
            if match:
                return match.group(1).strip()
        return ""
    except Exception as e:
        print(f"Reader call failed for {url}: {e}")
        return ""

def get_evolution_proposal(scanned_data):
    """Consults Gemini (YOLO) to analyze trends and propose optimizations."""
    system_dna = ""
    dna_path = os.path.join(PROJECT_ROOT, "GEMINI.md")
    if os.path.exists(dna_path):
        with open(dna_path, "r") as f:
            system_dna = f.read()

    query = (
        f"You are the 'Genie Evolver'. Your current DNA/Capabilities are: {system_dna}\n\n"
        f"Here is new data scanned from the tech world today:\n{scanned_data}\n\n"
        "TASK: Analyze this data for opportunities to:\n"
        "1. Optimize existing agents (imggen, socialpub, stealth_browser, cronmaster, reader_agent).\n"
        "2. EXPLORE OPENCLAW: Look for features, architecture patterns or capabilities from the 'OpenClaw' framework that could enhance our system.\n"
        "3. Propose new agents that would significantly enhance system capabilities.\n"
        "4. Detect architectural trends that could improve memory or token efficiency.\n\n"
        "DEDUPLICATION: Skip topics already handled in history.\n"
        "OUTPUT: A professional markdown report titled 'Evolution Proposal YYYY-MM-DD'. "
        "Include a 'Executive Summary' section for Telegram."
    )
    
    try:
        cmd = ["gemini", "--yolo", query]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        return result.stdout.strip()
    except Exception as e:
        return f"Evolution analysis failed: {e}"

def main():
    print("[*] Evolver: Starting daily evolution scan...")
    
    with open(CONFIG_PATH, "r") as f:
        sources = json.load(f)
    
    all_content = []
    # Mix of sources for diversity
    urls = sources.get("github_topics", [])[:3] + sources.get("tech_news", [])[:2]
    
    for url in urls:
        print(f"[*] Scanning source: {url}")
        content = call_reader(url)
        if content:
            all_content.append(content[:2500]) 
    
    if not all_content:
        print("[-] No content scanned. Evolution cycle aborted.")
        return

    # Analyze
    proposal = get_evolution_proposal("\n\n---\n\n".join(all_content))
    
    # Save Proposal
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"proposal_{timestamp}.md"
    filepath = os.path.join(PROPOSAL_DIR, filename)
    
    with open(filepath, "w") as f:
        f.write(proposal)
    
    # Update History
    with open(HISTORY_FILE, "a") as f:
        f.write(f"- {datetime.now().strftime('%Y-%m-%d')}: Generated {filename}\n")

    # Extract Summary for Notifications
    summary_match = re.search(r"Executive Summary[:\s]*(.*?)(?=\n#|\n##|$)", proposal, re.DOTALL | re.I)
    summary = summary_match.group(1).strip() if summary_match else "New evolution proposal generated focusing on OpenClaw and Agents."

    # 1. Notify Telegram via Redis
    try:
        import redis
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
        r = redis.from_url(REDIS_URL, decode_responses=True)
        # We need a chat_id. Defaulting to one found in logs or common ID if available.
        # In this project, bridge.py handles routing.
        r.rpush("genie:response:outbox", json.dumps({
            "chat_id": 550914711, # Default Admin ID from logs
            "text": f"🚀 **GenieBot Evolver Task Completed**\n\n{summary}\n\n📄 Report: {filename}"
        }))
        print("[+] Telegram notification sent.")
    except Exception as e:
        print(f"[-] Failed to send Telegram notification: {e}")

    # 2. Update Google Calendar
    # Note: This requires credentials.json/token.json in the agent directory
    # If not found, it will skip but print a marker for the assistant.
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        
        token_path = os.path.join(PROJECT_ROOT, "config/token.json")
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, ['https://www.googleapis.com/auth/calendar.events'])
            service = build('calendar', 'v3', credentials=creds)
            
            event = {
                'summary': '🚀 GenieBot Evolver Scan Completed',
                'description': f'Daily system evolution report generated: {filename}\n\nSummary: {summary}',
                'start': {'dateTime': datetime.now().isoformat(), 'timeZone': 'UTC'},
                'end': {'dateTime': (datetime.now()).isoformat(), 'timeZone': 'UTC'},
            }
            service.events().insert(calendarId='primary', body=event).execute()
            print("[+] Google Calendar updated.")
        else:
            print("[-] Google Calendar token not found. Please sync manually.")
    except Exception as e:
        print(f"[-] Google Calendar update failed: {e}")

    # Output for Master to Capture
    print("-" * 30)
    print(f"EVOLVER_REPORT: {filepath}")
    print(f"TELEGRAM_SUMMARY: {summary}")
    print("-" * 30)
    print(f"SUCCESS: Evolution report saved at {filepath}")

if __name__ == "__main__":
    main()
