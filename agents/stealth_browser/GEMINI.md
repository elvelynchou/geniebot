# Stealth Browser Agent Context

## 1. Agent Overview
**Purpose**: An undetectable browser automation agent capable of bypassing anti-bot protections (Cloudflare, etc.) using `nodriver`.
**Unique Capability**: Manages isolated Chrome profiles (browser contexts) for different personas/accounts.
**Control Mode**: Operated via structured JSON directives (Playbooks) from the Orchestrator.

## 2. Functional Requirements
1.  **Anti-Detect Core**: Built on `nodriver` (CDP-based) to behave like a real user.
2.  **Profile Management**:
    - **Isolation**: Each profile stores its cookies/local_storage in `profiles/<name>`.
    - **Auto-Creation**: If a requested profile `<name>` does not exist:
        1. Initialize a new directory `profiles/<name>`.
        2. Launch Chrome in GUI mode.
        3. Pause and prompt user to perform manual login/setup.
        4. Save state upon exit.
    - **Default**: Use `profiles/default` if no profile name is provided.
3. **Automation Directives**:
    - Accepts a JSON file or string acting as a "Playbook".
    - Actions: 
        - `goto`: Navigate to URL.
        - `wait`: Pause for seconds.
        - `click`: Click element by selector or text.
        - `type`: Type text into input.
        - `snapshot`: Save screenshot.
        - `dump`: Extract raw HTML (truncated).
        - `extract_semantic`: **[NEW]** Captures the Accessibility Tree. Highly recommended for LLM to understand page structure and interactive elements without HTML noise.
    - **Protocol**: Returns results in standardized JSON format.


## 3. Architecture
- **Directory Structure**:
    - `src/`: Codebase.
    - `profiles/`: Persistent storage for Chrome User Data Directories.
    - `venv/`: Isolated dependencies.
- **Key Files**:
    - `README_CN.md`: Comprehensive design & requirement doc (Chinese).
    - `activity_log.md`: Execution history.

## 4. Usage
```bash
# Basic run with default profile
python3 src/main.py --task '{"action": "goto", "url": "https://example.com"}'

# Run with specific profile (Auto-creates if missing)
python3 src/main.py --profile "marketing_bot" --task playbook.json
```

## 5. Load Balancing & Profile Registry
To ensure system stability, specific profiles are **RESERVED** for distinct tasks.

**⚠️ Resource Policy: Low Concurrency**
- **Constraint**: Minimize concurrent executions. Chrome instances are heavy.
- **Rule**: If `default` (MTC Daemon) is running, avoid launching other profiles unless for urgent/blocking tasks.
- **Queueing**: Future versions should implement a strict serial queue.

| Profile Name | Status | Assigned Role | Notes |
| :--- | :--- | :--- | :--- |
| `default` | **LOCKED** | **MTC Trading Daemon** | 24/7 Process. Do NOT use for ad-hoc tasks. |
| `scout` | **OPEN** | **Ad-hoc / Inspector** | Use for `whale_radar` checks, CLI snapshots, and general verification. |
| `search_agent` | **SINGLE** | **Deep Search** | Strictly for `search_agent` (enforced by lockfile). |
| `lab_generator`| **OPEN** | **ImageFX Gen** | Dedicated for `imggen` / `weather_photo`. |
| `social_manager`| **OPEN** | **Social Posting** | Dedicated for `socialpub` (X/Threads). |

**Rule**: Always specify `--profile scout` for general-purpose tasks to avoid crashing the Trading Daemon.
