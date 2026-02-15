import argparse
import json
import os
import sys
import subprocess
import time
from urllib.parse import urlparse

# Configuration
AGENT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
READER_CLI = os.path.join(AGENT_ROOT, "dist/cli/index.js")
LOG_DIR = os.path.join(AGENT_ROOT, "logs")
OUTPUT_DIR = os.path.join(AGENT_ROOT, "output")

def save_to_file(content, url):
    """Saves the markdown content to the output directory."""
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        domain = urlparse(url).netloc.replace(".", "_")
        timestamp = int(time.time())
        filename = f"{domain}_{timestamp}.md"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return filepath
    except Exception as e:
        print(f"Warning: Failed to save file: {e}")
        return None

def scrape_url(url):
    """Calls the underlying Node.js reader engine to scrape and convert to markdown."""
    # Ensure build exists
    if not os.path.exists(READER_CLI):
        return {"error": "Reader engine not built. Run 'npm run build' in agent directory."}

    # Corrected command: reader scrape [options] <urls...>
    cmd = ["node", READER_CLI, "scrape", url]
    
    try:
        # We capture stdout which contains the JSON
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            try:
                # The CLI outputs JSON
                data = json.loads(result.stdout.strip())
                # Extract markdown from the standard response structure
                markdown_content = ""
                if "data" in data and len(data["data"]) > 0:
                    markdown_content = data["data"][0].get("markdown", "")
                else:
                    markdown_content = result.stdout.strip() # Fallback

                return {
                    "url": url,
                    "content": markdown_content,
                    "status": "success"
                }
            except json.JSONDecodeError:
                # Not JSON, maybe it is direct markdown output
                return {
                    "url": url,
                    "content": result.stdout.strip(),
                    "status": "success"
                }
        else:
            return {
                "error": f"Scraper failed with code {result.returncode}",
                "details": result.stderr.strip()
            }
    except subprocess.TimeoutExpired:
        return {"error": "Scraping timed out after 120 seconds."}
    except Exception as e:
        return {"error": str(e)}

from utils.codemapper import CodeMapper

def main():
    parser = argparse.ArgumentParser(description="Genie Reader Agent - Clean Web-to-Markdown Scraper")
    parser.add_argument("--url", required=True, help="URL to scrape")
    parser.add_argument("--map", action="store_true", help="Extract only structure (cgrep mode) to save tokens")
    args = parser.parse_args()

    print(f"[*] Reading: {args.url} (Mode: {'Map' if args.map else 'Full'})")
    
    result = scrape_url(args.url)
    
    if "error" in result:
        print(f"ERROR: {result['error']}")
        if "details" in result:
            print(f"DETAILS: {result['details']}")
        sys.exit(1)
    
    content = result["content"]
    if args.map:
        print("[*] Applying CodeMapper (cgrep) logic...")
        content = CodeMapper.map_markdown(content)
    
    # Standard GenieBot Success Signal
    print("-" * 30)
    print("PAGE_CONTENT_START")
    print(content)
    print("PAGE_CONTENT_END")
    print("-" * 30)
    
    # Save to output folder
    saved_path = save_to_file(content, args.url)
    if saved_path:
        print(f"FILE_SAVED: {saved_path}")
        # MESH EVOLUTION: Publish document_ready
        try:
            from utils.codemapper import CodeMapper # Ensure context
            sys.path.append(os.path.abspath(os.path.join(AGENT_ROOT, "../..")))
            from core.protocol import AgentMesh
            AgentMesh.publish_event("document_ready", {
                "path": os.path.abspath(saved_path),
                "url": args.url,
                "mode": "Map" if args.map else "Full"
            })
        except Exception as e:
            print(f"Warning: Mesh event failed: {e}")
    
    print(f"SUCCESS: Scraped {args.url}")

if __name__ == "__main__":
    main()
