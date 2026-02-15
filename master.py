import sys
import os
import re
import subprocess
import json
import time
import select
import redis
from dotenv import load_dotenv

from core.session_manager import SessionManager
from core.context_builder import ContextBuilder
from core.ai_wrapper import call_gemini

# Load environment variables
load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
REDIS_RESPONSE_KEY = "genie:response:outbox"
REDIS_USER_INBOX = "genie:user:inbox"

def process_request(user_input, source, metadata, session_mgr, ctx_builder, redis_client):
    """
    Processes a single user request from any source.
    """
    # Identify User for Context
    user_id = "cli_user"
    if source == "telegram":
        user_id = f"tg_{metadata.get('username', 'unknown')}"
        print(f"\n[Incoming Telegram] {metadata.get('username')}: {user_input}")

    try:
        intent = session_mgr.detect_intent(user_input)
        context = ctx_builder.build_context(user_input, intent=intent)
        
        current_prompt = f"{context}\n\n[INSTRUCTION]: Think in English logic but reply in the user's language.\n\nUser Input: {user_input}"
        
        full_response = ""
        loop_count = 0
        max_loops = 5 # Prevent infinite loops

        while loop_count < max_loops:
            loop_count += 1
            full_response = ""
            
            # 1. Call Gemini
            if source == "cli":
                sys.stdout.write("GenieBot >> ")
                sys.stdout.flush()

            for chunk in call_gemini(current_prompt):
                full_response += chunk
                if source == "cli":
                    sys.stdout.write(chunk)
                    sys.stdout.flush()
            
            if source == "cli": sys.stdout.write("\n")

            # 2. Check for Agent Execution
            agent_match = re.search(r"EXECUTE_AGENT:\s+([a-zA-Z0-9_-]+)(.*)", full_response)
            if not agent_match:
                # No more agents to call, send final text to user
                if source == "telegram":
                    redis_client.rpush(REDIS_RESPONSE_KEY, json.dumps({
                        "chat_id": metadata.get("chat_id"),
                        "text": full_response.strip()
                    }))
                break

            # 3. Execute Agent (Now with streaming feedback)
            agent_name = agent_match.group(1)
            agent_args = agent_match.group(2).strip()
            print(f"[SYSTEM] Loop {loop_count}: Executing {agent_name} {agent_args}")
            
            chat_id = metadata.get("chat_id") if source == "telegram" else None
            agent_output = execute_agent(agent_name, agent_args, redis_client=redis_client, chat_id=chat_id)
            
            # 4. Agent Chaining (No need for manual redis push for images/summaries here as they are handled in execute_agent)

            # 5. Feed Output Back to AI for Chaining
            # Truncate agent output if it's too large for the context
            safe_output = agent_output
            if len(safe_output) > 5000:
                safe_output = safe_output[:5000] + "\n... (truncated for brevity) ..."

            current_prompt = f"{current_prompt}\n\n[AI PREVIOUS RESPONSE]: {full_response}\n\n[AGENT OUTPUT]: {safe_output}\n\n[INSTRUCTION]: Process the agent output and continue if needed. If task complete, provide final summary."

    except Exception as e:
        print(f"System Error in processing: {str(e)}")
        if source == "telegram":
             redis_client.rpush(REDIS_RESPONSE_KEY, json.dumps({
                "chat_id": metadata.get("chat_id"),
                "text": f"System Error: {str(e)}"
            }))

def execute_agent(name, args, redis_client=None, chat_id=None):
    agent_root = os.path.join("agents", name)
    script_paths = [
        os.path.join(agent_root, "src", "generate.py"),
        os.path.join(agent_root, "src", "main.py")
    ]
    
    script_path = None
    for p in script_paths:
        if os.path.exists(p):
            script_path = p
            break

    if not script_path:
        return f"System Error: Agent script not found in {agent_root}/src/"

    venv_python = os.path.join(agent_root, "venv", "bin", "python3")
    python_exe = venv_python if os.path.exists(venv_python) else sys.executable
    
    cmd = [python_exe, script_path]
    if args:
        import shlex
        try:
            cmd.extend(shlex.split(args))
        except ValueError:
            cmd.extend(args.split())

    # --- SENTINEL EVOLUTION: Safety Audit ---
    try:
        # Import dynamically to avoid breaking if sentinel not installed
        sys.path.append(os.path.join(os.getcwd(), "agents", "sentinel", "src"))
        from checker import Sentinel
        sentinel = Sentinel()
        is_safe, msg = sentinel.vet_command(cmd)
        if not is_safe:
            print(f"[SENTINEL INTERCEPT] {msg}")
            return f"[ERROR]: Operation blocked by system safety policy. Reason: {msg}"
    except Exception as e:
        print(f"[SENTINEL] Warning: Audit skip due to error: {e}")
    # ----------------------------------------

    try:
        # Use Popen for streaming output
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1, universal_newlines=True)
        
        combined_output = ""
        start_time = time.time()
        last_status_time = time.time()

        while True:
            # Check for output from stdout
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            
            if line:
                combined_output += line
                print(f"[AGENT] {line.strip()}")
                
                # Immediate Telegram Forwarding for Status/Summary
                if redis_client and chat_id:
                    if "TELEGRAM_SUMMARY:" in line:
                        summary = line.split("TELEGRAM_SUMMARY:")[1].strip()
                        redis_client.rpush(REDIS_RESPONSE_KEY, json.dumps({
                            "chat_id": chat_id,
                            "text": f"🧠 Evolver Insight:\n{summary}"
                        }))
                    elif "IMAGE_GENERATED:" in line:
                        img_path = line.split("IMAGE_GENERATED:")[1].strip()
                        redis_client.rpush(REDIS_RESPONSE_KEY, json.dumps({
                            "chat_id": chat_id,
                            "type": "photo",
                            "path": img_path,
                            "caption": "Image generated successfully."
                        }))

            # Heartbeat: If no output for 15s and still running
            if time.time() - last_status_time > 15 and redis_client and chat_id:
                redis_client.rpush(REDIS_RESPONSE_KEY, json.dumps({
                    "chat_id": chat_id,
                    "text": "⏳ Monitoring task execution..."
                }))
                last_status_time = time.time()

        # Capture remaining stderr
        stderr_output = process.stderr.read()
        if stderr_output:
            print(f"[AGENT STDERR] ({name}):\n{stderr_output}")
            if not combined_output:
                combined_output = f"[ERROR]:\n{stderr_output}"

        return combined_output.strip()
            
    except Exception as e:
        return f"System Error: Failed to execute agent {name}: {str(e)}"

def main():
    session_mgr = SessionManager()
    ctx_builder = ContextBuilder()
    
    # Redis Setup
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        redis_client.ping()
    except Exception as e:
        print(f"Warning: Redis connection failed ({e}). Telegram replies will not work.")
        redis_client = None

    print("GenieBot (Bridge-03) Master Engine Active.")
    print("Modes: [CLI] Interactive | [Telegram] Listening on Redis (genie:user:inbox)")
    print("Type 'exit' or 'quit' to stop.")
    
    while True:
        try:
            input_source = None
            user_input = None
            metadata = {}

            # 1. Check Stdin (Non-blocking)
            ready_read, _, _ = select.select([sys.stdin], [], [], 0.05)
            
            if sys.stdin in ready_read:
                line = sys.stdin.readline()
                if line:
                    user_input = line.strip()
                    input_source = "cli"
            
            # 2. Check Redis Queue (Telegram)
            if not user_input and redis_client:
                # Use a small timeout to not block CLI input forever
                result = redis_client.blpop(REDIS_USER_INBOX, timeout=1)
                if result:
                    _, line = result
                    try:
                        data = json.loads(line)
                        user_input = data.get("text")
                        input_source = "telegram"
                        metadata = data
                    except json.JSONDecodeError:
                        pass

            # Process if we have input
            if user_input:
                if user_input.lower() in ["exit", "quit"] and input_source == "cli":
                    break
                
                process_request(user_input, input_source, metadata, session_mgr, ctx_builder, redis_client)
                
                # Restore CLI prompt
                if input_source == "cli":
                    sys.stdout.write("User >> ")
                    sys.stdout.flush()
                elif input_source == "telegram":
                    sys.stdout.write("\nUser >> ")
                    sys.stdout.flush()
            
            if not user_input:
                time.sleep(0.1)

        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            print(f"System Error: {str(e)}")
            time.sleep(1)

if __name__ == "__main__":
    main()