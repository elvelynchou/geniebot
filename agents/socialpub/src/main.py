import argparse
import json
import os
import sys
import subprocess
import time

# Configuration
STEALTH_BROWSER_CMD = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../stealth_browser/venv/bin/python3")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../stealth_browser/src/main.py"))
]

def create_x_playbook(text, image_path=None):
    playbook = [
        {"action": "goto", "url": "https://x.com/compose/post"},
        {"action": "wait", "seconds": 15}, 
        {"action": "hover_random"}, # Fake activity
    ]
    
    if image_path:
        abs_image_path = os.path.abspath(image_path)
        if os.path.exists(abs_image_path):
            playbook.append({"action": "file_upload", "selector": "input[type='file']", "path": abs_image_path})
            playbook.append({"action": "wait_for", "selector": "div[data-testid='attachments']", "timeout": 60})
            playbook.append({"action": "wait", "seconds": 10})
            playbook.append({"action": "hover_random"})
        else:
            print(f"Warning: Image not found at {abs_image_path}, proceeding with text only.")

    playbook.extend([
        {"action": "click", "selector": "div[data-testid='tweetTextarea_0']"},
        {"action": "wait", "seconds": 3},
        {"action": "type", "selector": "div[data-testid='tweetTextarea_0']", "text": text},
        {"action": "wait", "seconds": 7},
        {"action": "hover_random"},
        {"action": "click", "selector": "button[data-testid='tweetButton']", "text": "Post"},
        {"action": "wait", "seconds": 20},
        {"action": "snapshot", "path": f"proof_x_{int(time.time())}.png"}
    ])
    return playbook

def handle_mesh_event(event_data, platform, profile):
    """Callback for mesh events."""
    event_type = event_data.get("event")
    data = event_data.get("data", {})
    
    if event_type == "image_ready":
        img_path = data.get("path")
        prompt = data.get("prompt", "New generation from GenieBot")
        print(f"\n[MESH] Caught image_ready event! Publishing to {platform}...")
        
        # Simple logic to auto-post
        text = f"✨ New AI Creation: {prompt} #GenieBot #AIArt"
        publish_to_platform(platform, text, img_path, profile)

def publish_to_platform(platform, text, image, profile):
    """Core logic to run stealth browser for publishing."""
    if platform == "x":
        playbook = create_x_playbook(text, image)
    else:
        print(f"Error: Platform {platform} not supported.")
        return False

    task_json = json.dumps(playbook)
    cmd = STEALTH_BROWSER_CMD + ["--profile", profile, "--task", task_json]
    
    try:
        print(f"[*] Publishing to {platform} via Stealth Browser (GUI)...")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"SUCCESS: Post published to {platform}.")
            return True
        else:
            print(f"ERROR: Publication failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Social Media Publisher Agent")
    parser.add_argument("--platform", default="x", choices=["x"], help="Target platform")
    parser.add_argument("--text", help="Post content (required unless --listen is used)")
    parser.add_argument("--image", help="Optional path to image file")
    parser.add_argument("--profile", default="lab_generator", help="Stealth Browser profile")
    parser.add_argument("--listen", action="store_true", help="Listen for Mesh events and publish automatically")
    args = parser.parse_args()

    if args.listen:
        # MESH EVOLUTION: Start listening
        PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
        sys.path.append(PROJECT_ROOT)
        from core.protocol import AgentMesh
        print(f"[*] SocialPub Mesh Listener Active. Waiting for events...")
        AgentMesh.subscribe(lambda data: handle_mesh_event(data, args.platform, args.profile), event_types=["image_ready"])
        return

    # Standard manual mode
    if not args.text:
        print("Error: --text is required in manual mode.")
        sys.exit(1)

    print(f"[*] Preparing post for {args.platform} using profile: {args.profile}")
    publish_to_platform(args.platform, args.text, args.image, args.profile)

if __name__ == "__main__":
    main()
