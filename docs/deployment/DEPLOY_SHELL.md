# 🚀 GenieBot (Bridge-03) Standard Deployment Blueprint (Feb 2026)

This document is the "Golden Image" for GenieBot. Running these commands will replicate the current autonomous environment from zero.

## 🛠️ Phase 1: Directories & Core DNA
```bash
mkdir -p core agents/{sys_check,evolver,reader_agent,imggen,socialpub,stealth_browser,vault,sentinel}/src \
         agents/{vault/storage/{images,documents,snapshots,metadata},vault/logs} \
         gateway/src logs/sessions memory/daily config
```

## 🛠️ Phase 2: Core Kernel (Communication & Security)

### 1. The AI Protocol (`core/protocol.py`)
Includes `AgentMesh` for autonomous signaling and `AgentResponse` for standardized output.
```python
# [Insert content from current core/protocol.py]
```

### 2. The Safety Gatekeeper (`agents/sentinel/src/checker.py`)
Mandatory audit layer before any shell execution.
```python
# [Insert content from current agents/sentinel/src/checker.py]
```

### 3. The AI Bridge Daemon (`gateway/src/daemon.js`)
Node.js high-performance scheduler with auto-model switching.
```javascript
// [Insert content from current gateway/src/daemon.js]
```

## 🛠️ Phase 3: High-Level Orchestration (`master.py`)
The main loop supporting CLI, Telegram, Sentinel Audit, and Loop Feedback.
```python
# [Insert content from current master.py]
```

## 🛠️ Phase 4: Autonomous "Mesh" Services

### 1. Artifact Vault (`agents/vault/src/main.py`)
Listens for mesh events and archives results with metadata.
```python
# [Insert content from current agents/vault/src/main.py]
```

### 2. Social Publisher (Listener Mode)
Automatically posts generated images to X.
```bash
# Start background listener
./agents/socialpub/venv/bin/python3 agents/socialpub/src/main.py --listen &
```

## 🛠️ Phase 5: Installation & Execution
```bash
# 1. Root Venv
python3 -m venv venv
./venv/bin/pip install redis sentence-transformers numpy psutil python-telegram-bot python-dotenv PyYAML

# 2. Start all services
chmod +x start.sh
./start.sh
```
