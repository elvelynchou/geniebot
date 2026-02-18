import argparse
import json
import os
import sys
import subprocess
import time
import shutil
import glob
import random
import requests
from io import BytesIO
from PIL import Image
from datetime import datetime
from dotenv import load_dotenv

# Configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
load_dotenv(os.path.join(BASE_DIR, ".env"))

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../output"))
DOWNLOADS_DIR = os.path.expanduser("~/Downloads")
STEALTH_BROWSER_CMD = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../stealth_browser/venv/bin/python3")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../stealth_browser/src/main.py"))
]

# ModelScope Configuration
MODELSCOPE_API_KEY = os.getenv("MODELSCOPE_API_KEY")
MODELSCOPE_BASE_URL = 'https://api-inference.modelscope.cn/'

def get_new_file(directory, start_time, extensions=['.jpg', '.png', '.jpeg']):
    """Finds a file created AFTER start_time with given extensions."""
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(directory, "*" + ext)))
    
    if not files:
        return None

    new_files = [f for f in files if os.path.getmtime(f) > start_time]
    
    if not new_files:
        return None

    return max(new_files, key=os.path.getmtime)

def resolve_playbook(playbook):
    """Resolves dynamic fields like random waits in the playbook."""
    resolved = []
    for step in playbook:
        new_step = step.copy()
        if step.get("action") == "wait":
            if "min" in step and "max" in step:
                new_step["seconds"] = round(random.uniform(step["min"], step["max"]), 2)
                del new_step["min"]
                del new_step["max"]
        resolved.append(new_step)
    return resolved

def generate_with_modelscope(prompt):
    """Generates image using ModelScope API via ClawProxy (Token-Blind)."""
    print(f"[*] Generating with ModelScope (via ClawProxy) for prompt: {prompt}")
    
    proxy_url = "http://127.0.0.1:8080/v1/proxy/modelscope"
    headers = {
        "X-Genie-Agent": "imggen",
        "Content-Type": "application/json"
    }

    try:
        # 1. Initiation
        payload = {
            "url": f"{MODELSCOPE_BASE_URL}v1/images/generations",
            "headers": {"X-ModelScope-Async-Mode": "true"},
            "payload": {
                "model": "Tongyi-MAI/Z-Image-Turbo",
                "prompt": prompt
            }
        }
        response = requests.post(proxy_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        task_id = response.json()["task_id"]
        
        print(f"[*] Task ID: {task_id}. Waiting for completion...")

        while True:
            # 2. Polling
            poll_payload = {
                "method": "GET",
                "url": f"{MODELSCOPE_BASE_URL}v1/tasks/{task_id}",
                "headers": {"X-ModelScope-Task-Type": "image_generation"}
            }
            result = requests.post(proxy_url, headers=headers, json=poll_payload, timeout=10)
            result.raise_for_status()
            data = result.json()

            status = data.get("task_status")
            if status == "SUCCEED":
                img_url = data["output_images"][0]
                img_response = requests.get(img_url, timeout=30)
                img_response.raise_for_status()
                
                timestamp = int(time.time())
                filename = f"genie_{timestamp}.jpg"
                target_path = os.path.join(OUTPUT_DIR, filename)
                
                image = Image.open(BytesIO(img_response.content))
                image.save(target_path)
                
                return target_path
            elif status == "FAILED":
                raise Exception(f"ModelScope generation failed: {data}")
            
            time.sleep(2)
    except Exception as e:
        print(f"ERROR: ModelScope Proxy call failed: {e}")
        return None

def generate_with_labflow(prompt, profile):
    """Generates image using Labflow (Stealth Browser)."""
    print(f"[*] Generating with Labflow (Stealth Browser) using profile: {profile}")
    
    generation_start_time = time.time()
    
    playbook = [
        {"action": "block_resources", "types": ["media"]},
        {"action": "goto", "url": "https://labs.google/fx/tools/flow"},
        {"action": "wait", "min": 12, "max": 18},
        {"action": "click", "text": "New project"},
        {"action": "wait", "min": 8, "max": 12},
        {"action": "click", "selector": "button[role='combobox']"},
        {"action": "wait", "min": 3, "max": 5},
        {"action": "click", "selector": "[role='option']", "text": "Create Image"},
        {"action": "wait", "min": 2, "max": 4},
        {"action": "click", "selector": "body", "x": 10, "y": 10},
        {"action": "wait", "min": 2, "max": 3},
        {"action": "click", "text": "Settings"},
        {"action": "wait", "min": 2, "max": 4},
        {"action": "click", "text": "Outputs per prompt"},
        {"action": "wait", "min": 2, "max": 3},
        {"action": "click", "selector": "*[role='option']", "text": "1"},
        {"action": "wait", "min": 2, "max": 4},
        {"action": "click", "selector": "body", "x": 10, "y": 10},
        {"action": "wait", "min": 1, "max": 2},
        {"action": "click", "selector": "textarea"},
        {"action": "wait", "min": 2, "max": 3}, 
        {"action": "type", "selector": "textarea", "text": prompt},
        {"action": "wait", "min": 3, "max": 5},
        {"action": "click", "text": "Create"},
        {"action": "wait", "seconds": 90},
        {"action": "click", "selector": "img[src*='googleusercontent']"},
        {"action": "wait", "min": 2, "max": 3},
        {"action": "click", "selector": "button[aria-haspopup='menu']"},
        {"action": "wait", "min": 3, "max": 5},
        {"action": "click", "selector": "div[role='menuitem']", "text": "Download 1K"},
        {"action": "wait", "min": 5, "max": 8}
    ]

    task_json = json.dumps(resolve_playbook(playbook))
    cmd = STEALTH_BROWSER_CMD + ["--profile", profile, "--task", task_json]

    try:
        subprocess.run(cmd, capture_output=True, text=True)
        
        # Polling for new image
        timeout = 60
        start_poll_time = time.time()
        while time.time() - start_poll_time < timeout:
            new_file = get_new_file(DOWNLOADS_DIR, generation_start_time)
            if new_file:
                timestamp = int(time.time())
                ext = os.path.splitext(new_file)[1]
                filename = f"genie_{timestamp}{ext}"
                target_path = os.path.join(OUTPUT_DIR, filename)
                shutil.move(new_file, target_path)
                return target_path
            time.sleep(2)
        return None
    except Exception as e:
        print(f"ERROR: Labflow failed: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Genie Image Generator")
    parser.add_argument("--prompt", help="Direct image prompt")
    parser.add_argument("--template", help="Name of the template in templates/ folder")
    parser.add_argument("--engine", default="ModelScope", choices=["ModelScope", "Labflow"], help="Engine to use")
    parser.add_argument("--profile", default="lab_generator", help="Browser profile")
    
    args, unknown = parser.parse_known_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    final_prompt = ""

    # 1. Resolve Prompt via Template or Direct Input
    if args.template:
        template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", f"{args.template}.txt")
        if not os.path.exists(template_path):
            print(f"ERROR: Template {args.template} not found at {template_path}")
            sys.exit(1)
        
        with open(template_path, "r") as f:
            final_prompt = f.read()
        
        # Inject unknown arguments into template (e.g., --SUBJECT "Value")
        import re
        for i in range(0, len(unknown), 2):
            if i+1 < len(unknown):
                key = unknown[i].lstrip("-").upper()
                val = unknown[i+1]
                final_prompt = final_prompt.replace(f"{{{key}}}", val)
    else:
        final_prompt = args.prompt

    if not final_prompt:
        print("ERROR: Either --prompt or --template is required.")
        sys.exit(1)

    # 2. Execution
    if args.engine == "ModelScope":
        result_path = generate_with_modelscope(final_prompt)
    else:
        result_path = generate_with_labflow(final_prompt, args.profile)

    if result_path:
        # Standard output for Master Engine
        print(f"IMAGE_GENERATED: {result_path}")
        sys.exit(0)
    else:
        print(f"CRITICAL ERROR: Generation failed with {args.engine}. Check API keys and network.")
        sys.exit(1)

if __name__ == "__main__":
    main()
