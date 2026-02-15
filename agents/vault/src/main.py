import os
import json
import shutil
import time
import sys
from datetime import datetime

# Setup project context
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.append(PROJECT_ROOT)

from core.protocol import AgentMesh

# Configuration
VAULT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE = os.path.join(VAULT_ROOT, "storage")

def archive_artifact(event_data):
    """
    Archives an incoming file based on its type.
    """
    event_type = event_data.get("event")
    payload = event_data.get("data", {})
    source_path = payload.get("path")
    
    if not source_path or not os.path.exists(source_path):
        print(f"[VAULT] Error: Source file not found: {source_path}")
        return

    # 1. Determine Category
    filename = os.path.basename(source_path)
    ext = os.path.splitext(filename)[1].lower()
    
    category = "documents"
    if ext in [".jpg", ".jpeg", ".png", ".webp"]:
        category = "images" if "snapshot" not in filename else "snapshots"
    elif ext in [".md", ".txt", ".pdf"]:
        category = "documents"
    
    # 2. Target Path with Timestamp to prevent overwrites
    timestamp = int(time.time())
    new_filename = f"{timestamp}_{filename}"
    dest_path = os.path.join(STORAGE, category, new_filename)
    
    # 3. Perform Copy
    try:
        shutil.copy2(source_path, dest_path)
        print(f"[VAULT] Archived: {filename} -> storage/{category}/")
        
        # 4. Generate Metadata Entry
        meta = {
            "original_filename": filename,
            "archived_at": datetime.now().isoformat(),
            "event_type": event_type,
            "category": category,
            "local_path": dest_path,
            "payload": payload
        }
        
        meta_path = os.path.join(STORAGE, "metadata", f"{timestamp}_{os.path.splitext(filename)[0]}.json")
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=4)
            
    except Exception as e:
        print(f"[VAULT ERROR] Archive failed: {e}")

def search_vault(query):
    """
    Searches through metadata JSON files for keywords.
    """
    metadata_dir = os.path.join(STORAGE, "metadata")
    if not os.path.exists(metadata_dir):
        print("Vault is empty.")
        return

    results = []
    query = query.lower()
    
    for filename in os.listdir(metadata_dir):
        if filename.endswith(".json"):
            with open(os.path.join(metadata_dir, filename), "r") as f:
                try:
                    meta = json.load(f)
                    # Check in payload, original name, and category
                    searchable_text = json.dumps(meta).lower()
                    if query in searchable_text:
                        results.append(meta)
                except Exception:
                    continue

    if not results:
        print(f"No results found for '{query}'.")
    else:
        print(f"Found {len(results)} items in Vault:")
        for res in results:
            print(f"- [{res['category'].upper()}] {res['original_filename']} (Archived: {res['archived_at']})")
            print(f"  Path: {res['local_path']}")
            if 'payload' in res and 'prompt' in res['payload']:
                print(f"  Prompt: {res['payload']['prompt']}")
            print("-" * 20)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="GenieBot Vault - Artifact Management")
    parser.add_argument("--listen", action="store_true", help="Start the mesh listener")
    parser.add_argument("--search", help="Search the vault for keywords")
    args = parser.parse_args()

    if args.search:
        search_vault(args.search)
        return

    if args.listen:
        print("--- GenieBot Vault (Artifact Management) Active ---")
        print(f"[*] Storage: {STORAGE}")
        print("[*] Mesh Mode: Listening for artifact events...")
        
        # Subscribe to all 'ready' events
        AgentMesh.subscribe(
            archive_artifact, 
            event_types=["image_ready", "document_ready", "snapshot_ready"]
        )
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
