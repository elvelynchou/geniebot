# SYSTEM_CHANGELOG.md - GenieBot (Bridge-03)

This file tracks all system-wide changes, architecture evolutions, and agent/skill additions.

## [2026-02-14] - The Great Evolution & Mesh Integration

### 🚀 New Architecture: "GenieOS" Kernel
- **Mesh Protocol (Phase 2)**: Updated `core/protocol.py` with `AgentMesh` class. Agents can now publish and subscribe to Redis-based events (e.g., `image_ready`).
- **Sentinel Gateway (Phase 3)**: Created `agents/sentinel` for runtime safety auditing. Integrated into `master.py` to intercept high-risk shell commands (e.g., `rm`).
- **Artifact Vault (Phase 1)**: Created `agents/vault` for centralized, typed storage (`images`, `documents`, `snapshots`) and metadata indexing. Added `--search` capability.

### 🧠 Core & Daemon Fixes
- **AI Daemon Fix**: Corrected duplicate `stderr` declaration SyntaxError in `gateway/src/daemon.js`.
- **System Stats**: Integrated AI model usage statistics into `agents/sys_check`.
- **Logic Cleanup**: Deleted legacy MTC/Boktoshi bot files to ensure a clean Bridge-03 environment.

### 🎭 Stealth & Intelligence Upgrades
- **Precision Navigation**: Added `extract_semantic`, `click_node`, and `type_node` to `stealth_browser` using CDP Accessibility Tree.
- **Deep Obfuscation**: Injected high-fidelity stealth patches (Mock `chrome.runtime`, `WebGL` vendors, `navigator.languages`) to bypass advanced bot detection.
- **Structural Reading**: Integrated `cgrep` logic into `reader_agent` for token-efficient code and document mapping.

### 🛠️ Extensibility
- **Architect Skill**: Packaged system architectural standards into the `architect-genie` Agent Skill for on-demand expert auditing.
- **Automated Notifications**: Added Telegram and Google Calendar callbacks to the `evolver` agent's task completion flow.

### 📄 Documentation
- **Deployment Blueprints**: Fully rewrote `docs/deployment/DEPLOY_SHELL.md` and `DEPLOY_PROMPT.md` to reflect the latest system state.

---
*End of Day Log - Saturday, Feb 14, 2026*
