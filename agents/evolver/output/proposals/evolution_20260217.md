# Evolution Proposal 2026-02-17

## Executive Summary (Telegram)
🚀 **GenieBot Evolution 2026-02-17**: Today's scan highlights **Agent Infrastructure** and **Security Sandboxing**. 
1. **Thinking Framework**: Implementing `/think` protocol for structured 5-element reasoning before complex tasks.
2. **Security+**: Adding a **DLP Proxy** layer to scrub API keys and secrets from logs/mesh in real-time.
3. **API Scout**: New agent to index and map undocumented APIs for better data extraction.
4. **Local Dashboard**: Lightweight Web UI for real-time log and artifact monitoring.

---

## 1. Optimize Existing Agents

### 1.1 `stealth_browser` + DLP Proxy (Inspired by Raypher)
**Current State**: Secrets could potentially leak into `activity_log.md` or screenshots if not carefully handled.
**Evolution**: 
- Implement a "Network DLP (Data Loss Prevention) Proxy" within the `stealth_browser` venv.
- **Action**: Intercept outbound/inbound traffic and scrub known API keys (from `.env`) before they are stored in activity logs or passed back to the Gateway.
- **Impact**: Zero-leakage browser automation.

### 1.2 `reader_agent` + Undocumented API Mapping (Inspired by Bluebox)
**Current State**: `reader_agent` focuses on markdown extraction from visible HTML.
**Evolution**:
- Enhance `reader_agent` with a "Bluebox" module.
- **Action**: Use `stealth_browser` to capture Network (CDP) events while scrolling a page to identify hidden API endpoints (JSON/XHR).
- **Impact**: Enables data extraction from "API-only" sites that don't render content in static HTML.

---

## 2. Explore OpenClaw: Agent Infrastructure

### 2.1 The "Agent-as-Infrastructure" Shift
**Observation**: OpenClaw (via accordio.ai) promotes the idea that the agent layer is just another piece of infra like a database.
**Proposed Change**: 
- **Standardize IPC**: Move from JSON-over-files to a strictly enforced **JSON-over-Redis-Streams** for all agents, making the Mesh the primary "bus".
- **Handoff Protocol**: Implement `EXECUTE_AGENT: <agent_name> {args}` not just for the user, but for agents to call each other programmatically.

---

## 3. New Agents Proprosal

### 3.1 `think_agent` (Structured Reasoning)
**Inspired by**: `effective-thinking-skill` (/think).
**Purpose**: Apply a structured 5-element analysis before the Orchestrator executes a high-risk or complex task.
**Framework**:
1. **Ground in Facts**: What do we know for certain?
2. **Stress-Test**: What if the tool fails or the page is blocked?
3. **Reframe**: Is there a simpler way (e.g., API vs. Scrape)?
4. **Implications**: What system files will be modified?
5. **Self-Audit**: Is this the most token-efficient path?

### 3.2 `api_scout` (Undocumented API Discovery)
**Inspired by**: `bluebox`.
**Purpose**: Crawl complex web apps to map their internal JSON APIs.
**Usage**: When `reader_agent` fails, `api_scout` is dispatched to find the "source of truth" in the network tab.

### 3.3 `monitor_ui` (Local Dashboard)
**Inspired by**: `gemini-web-wrapper`.
**Purpose**: A lightweight Node.js/FastAPI dashboard running on a local port.
**Features**:
- Real-time tailing of `logs/scheduler.log`.
- Gallery view of `vault/storage/images/`.
- Visual representation of the agent mesh status.

---

## 4. Architectural Trends: Memory & Token Efficiency

### 4.1 "Locate-then-Expand" (Token Efficiency)
**Trend**: Models like Sonnet 4.6 are cheaper, but context windows still cost tokens.
**Refinement**: 
- Implement a core `cgrep` tool integration. Instead of `read_file` on large files, agents must `cgrep` for symbols first, then only read the relevant 50 lines.

### 4.2 MCP (Model Context Protocol) Integration
**Observation**: Both MAKO and Bluebox use MCP.
**Proposal**:
- Wrap our `stealth_browser` and `reader_agent` as MCP-compliant servers. This allows us to use them with any external tools (like Claude Code or other CLI agents) without rewriting the logic.

---

## 5. Next Steps
1. **Pilot**: Implement the `/think` framework as a decorator for `orchestrator` logic.
2. **Security**: Add the DLP scrubber to `stealth_browser/src/main.py`.
3. **Research**: Prototype a basic MCP wrapper for `sys_check`.
