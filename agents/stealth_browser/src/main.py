import asyncio
import redis
import argparse
import json
import sys
import os
import time
import logging
import random
import urllib.request
import base64
from datetime import datetime
import nodriver as uc
try:
    import pyautogui
except ImportError:
    pyautogui = None

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = "/etc/myapp/geniebot"
sys.path.append(PROJECT_ROOT)

try:
    from core.protocol import AgentResponse
except ImportError:
    class AgentResponse:
        @staticmethod
        def success(msg, data=None, **kwargs): 
            print(msg)
            if data: print(json.dumps(data))
            sys.exit(0)
        @staticmethod
        def error(msg, data=None, **kwargs): 
            print(f"ERROR: {msg}")
            if data: print(json.dumps(data))
            sys.exit(1)

PROFILES_DIR = os.path.join(BASE_DIR, "profiles")
LOG_FILE = os.path.join(BASE_DIR, "activity_log.md")
RECORDER_SCRIPT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recorder.js")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

def log_activity(profile, status, message=""):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"| {timestamp} | {profile} | {status} | {message} |\n"
    try:
        with open(LOG_FILE, "a") as f:
            f.write(entry)
    except Exception as e:
        logging.error(f"Failed to write log: {e}")

class ProfileManager:
    def __init__(self, profile_name):
        self.name = profile_name or "default"
        self.path = os.path.join(PROFILES_DIR, self.name)
        self.is_new = not os.path.exists(self.path)

    def prepare(self):
        if self.is_new:
            logging.info(f"Profile '{self.name}' not found. Initializing new profile at: {self.path}")
            os.makedirs(self.path, exist_ok=True)
            return True 
        else:
            logging.info(f"Using existing profile: {self.name}")
            return False

class BrowserAutomation:
    def __init__(self, profile_manager):
        self.pm = profile_manager
        self.browser = None

    def _heal_preferences(self):
        """Fixes Chrome preferences to prevent 'Restore pages' bubble."""
        try:
            pref_file = os.path.join(self.pm.path, "Default", "Preferences")
            if not os.path.exists(pref_file):
                return
            
            with open(pref_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Reset exit_type to Normal to prevent crash restoration prompt
            if "profile" in data and "exit_type" in data["profile"]:
                if data["profile"]["exit_type"] != "Normal":
                    data["profile"]["exit_type"] = "Normal"
                    logging.info("Fixed Chrome exit_type to Normal.")
                    
                    with open(pref_file, "w", encoding="utf-8") as f:
                        json.dump(data, f)
        except Exception as e:
            logging.warning(f"Failed to heal preferences: {e}")

    async def launch(self, headless=False):
        if self.pm.is_new:
            headless = False 
            logging.info("New profile detected. Forcing GUI mode for initial setup.")

        # Heal preferences before start
        self._heal_preferences()

        try:
            # Enhanced Anti-detection Arguments (Cleaned up suspicious flags)
            browser_args = [
                "--no-sandbox", 
                "--disable-setuid-sandbox",
                "--disable-notifications",
                "--window-size=1280,720",
                "--accept-lang=en-US,en;q=0.9",
                "--start-maximized",
                "--no-default-browser-check",
                "--password-store=basic",
                "--enable-gpu",
                "--force-device-scale-factor=1",
                "--disable-dev-shm-usage"
            ]

            self.browser = await uc.start(
                user_data_dir=self.pm.path,
                headless=headless,
                browser_args=browser_args
            )
            
            # Post-launch: Stronger stealth injection
            main_tab = self.browser.main_tab
            # High-Fidelity Stealth Patch (Playwright-Bot-Bypass + Stealth DNA)
            stealth_js = """
            (() => {
                // 1. Properly delete webdriver property from prototype
                try {
                    const newProto = navigator.__proto__;
                    delete newProto.webdriver;
                    navigator.__proto__ = newProto;
                } catch (e) {}

                // 2. Mock chrome.runtime
                if (!window.chrome) { window.chrome = {}; }
                if (!window.chrome.runtime) {
                    window.chrome.runtime = {
                        PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
                        PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
                        PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
                        RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
                        OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
                        OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }
                    };
                }
                
                // 3. Mock languages (prevent empty list in headless or specialized environments)
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });

                // 4. Mock Permissions API
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );

                // 5. Mock WebGL Vendor/Renderer (Avoid SwiftShader/Google signs)
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    // UNMASKED_VENDOR_WEBGL
                    if (parameter === 37445) { return 'Google Inc. (Intel)'; }
                    // UNMASKED_RENDERER_WEBGL
                    if (parameter === 37446) { return 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)'; }
                    return getParameter.apply(this, arguments);
                };

                // 6. Mock plugins length
                if (navigator.plugins.length === 0) {
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5],
                    });
                }
            })();
            """
            # Inject on every new document for persistent stealth
            await main_tab.send(uc.cdp.page.add_script_to_evaluate_on_new_document(source=stealth_js))
            logging.info("Deep stealth patch (Languages/Permissions/WebGL) injected via CDP.")
            
            return self.browser
        except Exception as e:
            log_activity(self.pm.name, "ERROR", f"Launch failed: {str(e)}")
            raise e

    async def interactive_setup(self):
        print("\n" + "="*60)
        print(f"⚠️  NEW PROFILE INITIALIZATION: {self.pm.name}")
        print("The browser has opened. Please perform the following manually:")
        print("  1. Log in to necessary accounts.")
        print("  2. Solve any CAPTCHAs.")
        print("\nWhen you are done, press ENTER in this terminal to save and exit.")
        print("="*60 + "\n")
        await asyncio.get_event_loop().run_in_executor(None, input, "Press Enter to continue...")
        logging.info("User completed manual setup.")

    async def _smart_find(self, tab, selector, timeout=10):
        """Attempts to find an element with retries and waiting."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                elem = await tab.select(selector, timeout=1)
                if elem:
                    return elem
            except Exception:
                pass
            await asyncio.sleep(0.5)
        raise TimeoutError(f"Element not found: {selector}")

    async def _find_by_text(self, tab, text, timeout=10):
        """Attempts to find an element by text with retries."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                elem = await tab.find(text=text, best_match=True)
                if elem:
                    return elem
            except Exception:
                pass
            await asyncio.sleep(0.5)
        raise TimeoutError(f"Element with text '{text}' not found")

    async def _human_type(self, element, text):
        """Types text with burst patterns and thinking pauses to simulate human behavior."""
        # 1. Pre-typing pause: wait after focus
        await asyncio.sleep(random.uniform(1.0, 2.5))
        
        words = text.split(' ')
        for i, word in enumerate(words):
            for char in word:
                await element.send_keys(char)
                # Slower typing within words: 50ms to 250ms
                await asyncio.sleep(random.uniform(0.05, 0.25))
            
            # 2. Thinking pause between words: 0.3s to 1.2s
            if i < len(words) - 1:
                await element.send_keys(' ')
                await asyncio.sleep(random.uniform(0.3, 1.2))
            
            # 3. Longer natural pause after punctuation
            if word.endswith(('.', ',', '!', ':', '°')):
                await asyncio.sleep(random.uniform(1.2, 2.0))
        
        logging.info("Humanized typing complete (Slower mode).")

    async def execute_playbook(self, tasks):
        if not self.browser:
            raise Exception("Browser not initialized")

        main_tab = self.browser.main_tab
        results = []
        
        for i, task in enumerate(tasks):
            action = task.get("action")
            timeout = task.get("timeout", 10) 
            logging.info(f"Executing step {i+1}: {action}")

            try:
                if action == "goto":
                    url = task.get("url")
                    await main_tab.get(url)
                    logging.info(f"Navigated to {url}")

                elif action == "block_resources":
                    types = task.get("types", [])
                    if not types:
                        logging.warning("block_resources requires 'types' list")
                        continue
                    
                    resource_patterns = {
                        'image': ['*.jpg', ['*.jpeg'], '*.png', '*.gif', '*.webp', '*.svg', '*.bmp', '*.ico'],
                        'stylesheet': ['*.css'],
                        'font': ['*.woff', '*.woff2', '*.ttf', '*.otf', '*.eot'],
                        'script': ['*.js', '*.mjs'],
                        'media': ['*.mp4', '*.mp3', '*.wav', '*.avi', '*.webm']
                    }
                    
                    url_patterns = []
                    for t in types:
                        if t.lower() in resource_patterns:
                            val = resource_patterns[t.lower()]
                            if isinstance(val, list): url_patterns.extend(val)
                            else: url_patterns.append(val)
                        else:
                            url_patterns.append(t)
                    
                    if url_patterns:
                        # Ensure we don't have nested lists from my mistake above
                        flat_patterns = []
                        for p in url_patterns:
                            if isinstance(p, list): flat_patterns.extend(p)
                            else: flat_patterns.append(p)
                            
                        await main_tab.send(uc.cdp.network.enable())
                        await main_tab.send(uc.cdp.network.set_blocked_ur_ls(urls=flat_patterns))
                        logging.info(f"Blocking resource patterns: {flat_patterns}")

                elif action == "wait":
                    seconds = task.get("seconds")
                    if seconds:
                        await asyncio.sleep(seconds)

                elif action == "hover_random":
                    # Find some innocuous elements to hover over
                    # Links, spans, etc.
                    try:
                        potential_targets = await main_tab.select_all("a, span, h1, h2")
                        if potential_targets:
                            # Pick 2-3 random elements
                            count = min(len(potential_targets), random.randint(2, 3))
                            targets = random.sample(potential_targets, count)
                            for target in targets:
                                logging.info(f"Humanizing: Hovering over random element")
                                await target.mouse_move()
                                await asyncio.sleep(random.uniform(0.5, 1.5))
                    except Exception as e:
                        logging.warning(f"hover_random failed: {e}")

                elif action == "wait_for":
                    selector = task.get("selector")
                    timeout = task.get("timeout", 30)
                    if not selector:
                        raise ValueError("wait_for action requires 'selector'")
                    
                    logging.info(f"Waiting for element '{selector}' (timeout: {timeout}s)")
                    await self._smart_find(main_tab, selector, timeout=timeout)

                elif action == "snapshot":
                    filename = task.get("path", f"snapshot_{int(time.time())}.png")
                    await main_tab.save_screenshot(filename)
                    logging.info(f"Saved snapshot to {filename}")
                
                elif action == "type":
                    selector = task.get("selector")
                    text_match = task.get("text_match")
                    text_input = task.get("text")
                    
                    if selector:
                        elem = await self._smart_find(main_tab, selector, timeout=timeout)
                    elif text_match:
                        elem = await self._find_by_text(main_tab, text_match, timeout=timeout)
                    else:
                        raise ValueError("Type action requires selector or text_match")
                    
                    await elem.click()
                    await self._human_type(elem, text_input)

                elif action == "click_node":
                    node_id = task.get("node_id")
                    backend_node_id = task.get("backend_node_id")
                    
                    if backend_node_id:
                        # Convert backend node ID to object ID for interaction
                        obj = await main_tab.send(uc.cdp.dom.resolve_node(backend_node_id=backend_node_id))
                        # We use JS to click it via object_id for best reliability
                        await main_tab.send(uc.cdp.runtime.call_function_on(
                            function_declaration="(elem) => elem.click()",
                            object_id=obj.object_id,
                            arguments=[]
                        ))
                        logging.info(f"Clicked node via backend_node_id: {backend_node_id}")
                    else:
                        raise ValueError("click_node requires 'backend_node_id'")

                elif action == "type_node":
                    backend_node_id = task.get("backend_node_id")
                    text_input = task.get("text")
                    
                    if backend_node_id and text_input:
                        # Resolve to element and use standard type logic or JS
                        obj = await main_tab.send(uc.cdp.dom.resolve_node(backend_node_id=backend_node_id))
                        # Focus first
                        await main_tab.send(uc.cdp.runtime.call_function_on(
                            function_declaration="(elem) => elem.focus()",
                            object_id=obj.object_id
                        ))
                        # Send keys
                        await main_tab.send(uc.cdp.input_.insert_text(text=text_input))
                        logging.info(f"Typed into node {backend_node_id}")
                    else:
                        raise ValueError("type_node requires 'backend_node_id' and 'text'")

                elif action == "click":
                    selector = task.get("selector")
                    text_content = task.get("text")
                    
                    if selector and text_content:
                        elements = await main_tab.select_all(selector)
                        found = False
                        for elem in elements:
                            if text_content.lower() in elem.text.lower():
                                # Humanize: Move mouse to element first
                                await elem.mouse_move()
                                await asyncio.sleep(random.uniform(0.3, 0.8))
                                await elem.click()
                                found = True
                                break
                        if not found: raise ValueError(f"No '{selector}' with text '{text_content}'")
                    elif selector:
                        elem = await self._smart_find(main_tab, selector, timeout=timeout)
                        await elem.mouse_move()
                        await asyncio.sleep(random.uniform(0.3, 0.8))
                        await elem.click()
                    elif text_content:
                        elem = await self._find_by_text(main_tab, text_content, timeout=timeout)
                        await elem.mouse_move()
                        await asyncio.sleep(random.uniform(0.3, 0.8))
                        await elem.click()

                elif action == "hover":
                    selector = task.get("selector")
                    elem = await self._smart_find(main_tab, selector, timeout=timeout)
                    await elem.mouse_move()

                elif action == "press":
                    key = task.get("key")
                    # Map common names to CDP keys if needed, but nodriver/uc usually handles strings
                    # We'll use the dispatch_key_event for maximum compatibility
                    logging.info(f"Pressing key: {key}")
                    await main_tab.send(uc.cdp.input_.dispatch_key_event(type_="keyDown", key=key))
                    await asyncio.sleep(0.05)
                    await main_tab.send(uc.cdp.input_.dispatch_key_event(type_="keyUp", key=key))

                elif action == "press_key":
                    key = task.get("key")
                    if key == "Enter":
                        await main_tab.send(uc.cdp.input_.dispatch_key_event(type_="keyDown", windows_virtual_key_code=13, key="Enter"))
                        await main_tab.send(uc.cdp.input_.dispatch_key_event(type_="keyUp", windows_virtual_key_code=13, key="Enter"))

                elif action == "dump":
                    content = await main_tab.get_content()
                    results.append({"step": i+1, "action": "dump", "content": content[:5000]})
                
                elif action == "extract_semantic":
                    try:
                        # Get the full AX tree
                        ax_nodes = await main_tab.send(uc.cdp.accessibility.get_full_ax_tree())
                        semantic_tree = []
                        
                        # Filter for meaningful interactive elements
                        # Roles that are usually interactive or provide structural landmarks
                        important_roles = [
                            "button", "link", "input", "textbox", "searchbox", 
                            "checkbox", "radio", "combobox", "menuitem", 
                            "heading", "img", "tab", "tabpanel"
                        ]
                        
                        for node in ax_nodes:
                            role = node.role.value if node.role else "unknown"
                            name = node.name.value if node.name else ""
                            
                            # We only care about nodes that have a name OR are a specific interactive role
                            if name or role in important_roles:
                                node_data = {
                                    "role": role,
                                    "name": name,
                                    "nodeId": node.node_id if hasattr(node, "node_id") else None,
                                    "backendNodeId": node.backend_dom_node_id if hasattr(node, "backend_dom_node_id") else None
                                }
                                
                                # Add simple description for LLM
                                node_data["description"] = f"[{role}] \"{name}\""
                                semantic_tree.append(node_data)
                        
                        # Sort to keep some sense of order (optional but helpful)
                        # Truncate if too many to keep context window safe
                        results.append({
                            "step": i+1, 
                            "action": "extract_semantic", 
                            "count": len(semantic_tree),
                            "tree": semantic_tree[:100]  # Return top 100 elements
                        })
                    except Exception as e:
                        logging.error(f"Semantic extraction failed: {e}")
                        results.append({"step": i+1, "action": "extract_semantic", "error": str(e)})

                elif action == "extract_github_trending":
                    try:
                        # Lightweight extraction via JS
                        js_code = """
                        () => {
                            const repos = [];
                            document.querySelectorAll('article.Box-row').forEach(row => {
                                const title = row.querySelector('h2 a')?.innerText?.trim()?.replace(/\\s+/g, '');
                                const desc = row.querySelector('p')?.innerText?.trim();
                                const stars = row.querySelector('a[href$="/stargazers"]')?.innerText?.trim();
                                const lang = row.querySelector('[itemprop="programmingLanguage"]')?.innerText?.trim();
                                if (title) repos.push({title, desc, stars, lang});
                            });
                            return repos;
                        }
                        """
                        repos = await main_tab.evaluate(js_code)
                        results.append({"step": i+1, "action": "extract_github_trending", "data": repos})
                    except Exception as e:
                        results.append({"step": i+1, "action": "extract_github_trending", "error": str(e)})

                elif action == "download_file":
                    selector = task.get("selector")
                    dest_path = task.get("path")
                    timeout = task.get("timeout", 30)
                    
                    if not selector or not dest_path:
                        raise ValueError("download_file requires selector and path")

                    elem = await self._smart_find(main_tab, selector, timeout=timeout)
                    
                    # Try to get src from attributes
                    src = None
                    if hasattr(elem, "attrs"):
                        src = elem.attrs.get("src")
                    
                    # If not in attrs, try getting it via JS (sometimes reliable for dynamic props)
                    if not src:
                        src = await main_tab.evaluate("element => element.src", args=[elem])

                    if src:
                        logging.info(f"Downloading image from: {src[:50]}...")
                        # Use JS to fetch blob/url and convert to base64
                        js = """
                        async function(url) {
                            const response = await fetch(url);
                            const blob = await response.blob();
                            return new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                        }
                        """
                        result = await main_tab.evaluate(f"({js})('{src}')", await_promise=True)
                        
                        if result and "," in result:
                            header, encoded = result.split(",", 1)
                            data = base64.b64decode(encoded)
                            # Ensure dir exists
                            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                            with open(dest_path, "wb") as f:
                                f.write(data)
                            logging.info(f"Downloaded image to {dest_path}")
                        else:
                            raise Exception(f"Failed to download/convert image from {src}")
                    else:
                        raise Exception("Element has no src attribute")

                elif action == "file_upload":
                    # SHOTGUN APPROACH: Find ALL file inputs and inject into all of them
                    # This handles cases where there are multiple hidden inputs
                    selector = task.get("selector", "input[type='file']")
                    file_path = task.get("path")
                    timeout = task.get("timeout", 10)
                    
                    if not file_path:
                        raise ValueError("file_upload requires path")
                    abs_path = os.path.abspath(file_path)
                    if not os.path.exists(abs_path):
                        raise ValueError(f"File to upload not found: {abs_path}")

                    logging.info(f"Attempting SHOTGUN upload of {abs_path} to all matching '{selector}'")
                    
                    # 1. Get all file input nodes via CDP
                    try:
                        doc = await main_tab.send(uc.cdp.dom.get_document())
                        root_node_id = None
                        
                        # Case 1: doc has a 'root' attribute (some CDP wrappers)
                        if hasattr(doc, "root") and hasattr(doc.root, "node_id"):
                            root_node_id = doc.root.node_id
                        # Case 2: doc IS the root node (nodriver often returns this directly)
                        elif hasattr(doc, "node_id"):
                            root_node_id = doc.node_id
                        # Case 3: dict structure (raw JSON)
                        elif isinstance(doc, dict) and "root" in doc:
                            root_node_id = doc["root"]["nodeId"]
                        
                        if not root_node_id:
                            raise Exception(f"Could not find root node ID in document: {doc}")

                        node_ids = await main_tab.send(uc.cdp.dom.query_selector_all(node_id=root_node_id, selector=selector))
                        
                        # Handle node_ids return structure
                        target_ids = []
                        if hasattr(node_ids, "node_ids"):
                            target_ids = node_ids.node_ids
                        elif isinstance(node_ids, dict) and "nodeIds" in node_ids:
                            target_ids = node_ids["nodeIds"]
                        
                        if not target_ids:
                            logging.warning("No file inputs found via CDP query_selector_all")
                            # Fallback to single smart find
                            elem = await self._smart_find(main_tab, selector, timeout=timeout)
                            target_ids = [elem.node_id] if hasattr(elem, "node_id") else []

                        if target_ids:
                            success_count = 0
                            for nid in target_ids:
                                try:
                                    # CDP Inject
                                    await main_tab.send(uc.cdp.dom.set_file_input_files(
                                        files=[abs_path],
                                        node_id=nid
                                    ))
                                    success_count += 1
                                except Exception as e:
                                    logging.warning(f"Failed to inject into node {nid}: {e}")
                            
                            logging.info(f"Successfully injected file into {success_count} input nodes.")
                            
                            # 2. Trigger Events on all of them via JS
                            await main_tab.evaluate(f"""
                                document.querySelectorAll("{selector}").forEach(input => {{
                                    var event = new Event('change', {{ bubbles: true }});
                                    input.dispatchEvent(event);
                                    var inputEvent = new Event('input', {{ bubbles: true }});
                                    input.dispatchEvent(inputEvent);
                                }});
                            """)
                        else:
                            raise Exception("No file inputs found to upload to.")

                    except Exception as e:
                        raise Exception(f"Shotgun upload failed: {str(e)}")

                elif action == "pause":
                    print(f"\n⏸️  Paused. Press ENTER to continue...")
                    await asyncio.get_event_loop().run_in_executor(None, input, "")

                else:
                    logging.warning(f"Unknown action: {action}")

            except Exception as e:
                logging.error(f"Step {i+1} failed: {e}")
                log_activity(self.pm.name, "FAIL", str(e))

        return results

    async def close(self):
        if self.browser:
            try:
                # Stop the browser first
                self.browser.stop()
                # Small sleep to allow CDP connections to close gracefully
                await asyncio.sleep(0.5)
            except Exception as e:
                logging.debug(f"Non-critical error during browser stop: {e}")
            finally:
                self.browser = None

def update_marker(profile, status):
    marker_path = os.path.join(BASE_DIR, f"status_{profile}.marker")
    with open(marker_path, "w") as f:
        f.write(f"{status}|{int(time.time())}")

async def main():
    parser = argparse.ArgumentParser(description="Stealth Browser Automation")
    parser.add_argument("--profile", help="Chrome profile name", default="default")
    parser.add_argument("--task", help="JSON task/playbook string or file path")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--lock_timeout", type=int, default=300, help="Lock timeout in seconds")
    args = parser.parse_args()

    update_marker(args.profile, "STARTING")
    pm = ProfileManager(args.profile)
    is_new = pm.prepare()
    bot = BrowserAutomation(pm)

    # Redis Locking
    r = None
    lock_key = f"lock:profile:{args.profile}"
    lock_ttl = 300
    acquired = False
    
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
        r = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)
        r.ping()
    except Exception as e:
        logging.warning(f"Redis not available, skipping lock: {e}")
        r = None

    if r:
        logging.info(f"Attempting to acquire lock for profile '{args.profile}'...")
        update_marker(args.profile, "WAITING_FOR_LOCK")
        start_time = time.time()
        while time.time() - start_time < args.lock_timeout:
            if r.set(lock_key, "locked", ex=lock_ttl, nx=True):
                acquired = True
                update_marker(args.profile, "LOCKED")
                logging.info("Lock acquired.")
                break
            else:
                logging.info(f"Profile '{args.profile}' is busy. Waiting 5s...")
                await asyncio.sleep(5)
        
        if not acquired:
            update_marker(args.profile, "LOCK_FAILED")
            AgentResponse.error(f"Failed to acquire lock for profile '{args.profile}' after {args.lock_timeout}s. Profile is likely in use.")

    try:
        update_marker(args.profile, "LAUNCHING_CHROME")
        await bot.launch(headless=args.headless)
        
        if is_new:
            update_marker(args.profile, "INTERACTIVE_SETUP")
            await bot.interactive_setup()
        
        if args.task:
            update_marker(args.profile, "EXECUTING_TASK")
            try:
                if os.path.exists(args.task):
                    with open(args.task, "r") as f:
                        playbook = json.load(f)
                else:
                    playbook = json.loads(args.task)
            except Exception as e:
                AgentResponse.error(f"Failed to parse task JSON: {e}")

            if isinstance(playbook, dict):
                if "actions" in playbook:
                    playbook = playbook["actions"]
                else:
                    playbook = [playbook]
                
            results = await bot.execute_playbook(playbook)
            update_marker(args.profile, "COMPLETED")
            # Return success with the captured data
            AgentResponse.success(f"Executed {len(playbook)} steps.", data=results)
        else:
            update_marker(args.profile, "IDLE")
            logging.info("Idle mode. Press Ctrl+C to exit.")
            while True:
                await asyncio.sleep(1)
                
    except Exception as e:
        update_marker(args.profile, "FAILED")
        logging.error(f"Execution failed: {e}")
        AgentResponse.error(str(e))
    finally:
        await bot.close()
        if r and acquired:
            r.delete(lock_key)
            logging.info("Lock released.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())