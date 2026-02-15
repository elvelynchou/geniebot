# Technology Stack

## 1. Core Runtime
- **Backend:** Python 3.12+ (Orchestrator and specialized Agents).
- **Control Kernel:** Node.js (AI Daemon and Message Gateways).
- **CLI Engine:** Gemini CLI (Primary intelligence source).

## 2. Communication & Coordination
- **Event Bus:** Redis (Primary IPC mechanism using Pub/Sub and Lists).
- **Messaging Protocol:** Strict JSON-formatted inter-process communication.
- **Mesh Logic:** Redis-based asynchronous event dispatching between autonomous agents.

## 3. Storage & Memory
- **State Database:** Redis DB 1 (Session tracking, active tasks).
- **Memory Engine:** Local RAG system using `sentence-transformers` (`all-MiniLM-L6-v2`) and Redis for high-speed context retrieval.
- **Artifact Vault:** Typed file storage with JSON metadata indexing.

## 4. Automation & Interaction
- **Browser Automation:** `nodriver` (CDP-based stealth automation with advanced fingerprint mocking).
- **UI Perception:** Accessibility Tree (Semantic) extraction via CDP.
- **Gateways:** `python-telegram-bot` for real-time human-in-the-loop control.

## 5. Security & Governance
- **Command Firewall:** YAML-based Sentinel gateway for runtime shell command auditing.
- **Dependency Management:** Isolated Python Virtual Environments (`venv`) per agent.
