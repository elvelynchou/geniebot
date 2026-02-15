# 🧞 GenieBot (Bridge-03)

GenieBot is an autonomous, self-evolving personal assistant mesh. Built on the "GenieOS" kernel architecture, it leverages a Redis-based **Mesh Protocol** to coordinate specialized agents for image generation, social media management, market analysis, and architectural evolution.

## 🚀 Quick Start: Zero to Genie

Follow these steps to replicate the production environment.

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 20+**
- **Redis Server** (running on port 6379)
- **Google Chrome** (installed in `/bin/google-chrome` or default path)

### 2. Clone and Initialize
```bash
git clone https://github.com/elvelynchou/geniebot.git
cd geniebot
```

### 3. Environment Setup
Create the root virtual environment and install core dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt # Or install manually: redis sentence-transformers numpy psutil python-telegram-bot python-dotenv PyYAML
```

Install Node.js dependencies for the AI Gateway:
```bash
cd gateway
npm install ioredis
cd ..
```

### 4. Configuration
Copy the template and fill in your secrets:
```bash
cp .env.example .env
```
Edit `.env` with your:
- `TELEGRAM_BOT_TOKEN`: From @BotFather.
- `MODELSCOPE_API_KEY`: For image generation.
- `REDIS_URL`: `redis://localhost:6379/1` (GenieBot standard uses DB 1).

### 5. Agent Scaffolding
GenieBot uses isolated environments for each agent. Run the setup for critical agents:
```bash
# Vault (Artifact Management)
python3 -m venv agents/vault/venv
agents/vault/venv/bin/pip install redis

# Imggen
python3 -m venv agents/imggen/venv
agents/imggen/venv/bin/pip install requests Pillow redis

# Stealth Browser
python3 -m venv agents/stealth_browser/venv
agents/stealth_browser/venv/bin/pip install nodriver pyautogui redis
```

### 6. Launching the System
GenieBot requires multiple processes to be active. Use the provided startup script:
```bash
chmod +x start.sh
./start.sh
```
The script will launch:
1. **AI Daemon** (Node.js) - Handles model switching and Gemini CLI stream.
2. **Telegram Bridge** - Connects the bot to the cloud.
3. **CronMaster** - Handles scheduled tasks (Weather, Evolution).
4. **Master Engine** - The primary logic loop.

---

## 🧠 System Architecture

- **Core Kernel**: `master.py` (Logic) + `daemon.js` (Intelligence Gateway).
- **Mesh Protocol**: Asynchronous event-driven coordination via Redis Pub/Sub.
- **Sentinel**: Runtime command firewall ensuring shell safety.
- **Vault**: Typed artifact storage with metadata indexing.
- **Evolver**: Daily R&D cycle that analyzes trends and proposes code optimizations.

## 🛡️ Security
GenieBot includes a **Sentinel** gatekeeper. High-risk commands (e.g., `rm`, `mkfs`) are intercepted by the runtime firewall defined in `config/safety_policy.yaml`.

## 📈 Evolution
The system is designed to be self-improving. Daily reports are generated in `agents/evolver/output/proposals/`. Review them to see the next stage of Genie's growth.

---
*Created by Genie - The System Architect*
