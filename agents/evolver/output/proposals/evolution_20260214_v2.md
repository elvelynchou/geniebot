# Evolution Proposal 2026-02-14 (Deep Security & Team Orchestration)

## Executive Summary (Telegram)
🛡️ **GenieBot Security & Team Evolution**: A deep dive into today's tech trends (SEKSBot, Rampart, DevClaw) reveals critical upgrades for our core architecture:
1. **Secret Broker (SEKS Pattern)**: Moving API keys out of agent environments. Agents will use `SECRET_REF` tokens; the Gateway injects real keys only at the final request.
2. **Command Firewall (Rampart Pattern)**: Implementing a YAML-based policy engine to intercept and vet all shell commands before execution.
3. **Team-Group Orchestration (DevClaw Pattern)**: Enabling "Swarm Mode" in Telegram groups where Planner, Dev, and QA agents collaborate on a single task.
4. **MCP Memory Bridge**: Standardizing our `vector_store` to the Model Context Protocol (MCP) for cross-tool interoperability.

---

## 1. Security: The "Secret Broker" Model (SEKSBot Pattern)
**Context**: Currently, agents may have access to environment variables containing API keys. Prompt injection or malicious dependencies could exfiltrate these.
**Proposal**:
- **Implementation**: Refactor `core/protocol.py` and `gateway/telegram_bridge.py` to handle secret injection.
- **Workflow**:
    - Agents see: `POST /api/endpoint { "api_key": "{{SEARCH_API_KEY_REF}}" }`
    - The `Gateway Wrapper` intercepts the outgoing call, looks up the key in a secure vault (Redis/Env), and performs the injection.
- **Benefit**: Zero-Trust security. Even if an agent is fully compromised, it never "knows" the actual credentials.

## 2. Governance: Runtime Command Firewall (Rampart Pattern)
**Context**: Agents running in "YOLO mode" (full shell access) are a risk.
**Proposal**:
- **Agent: GuardDog (New)**: A middleware agent that sits between the Orchestrator and the shell.
- **Implementation**: A YAML configuration file `config/firewall_policy.yaml` defining:
    - `Allowed`: `ls`, `grep`, `cat`, `python3 src/*.py`.
    - `Restricted`: `rm`, `curl` (to untrusted domains), `ssh`.
    - `Action`: Block and Alert, or Require Human Approval.
- **Impact**: Physical protection against hallucinations or malicious code generation.

## 3. Orchestration: "Swarm" Team Mode (DevClaw Pattern)
**Context**: Complex tasks often fail because a single agent session gets overwhelmed or loses context.
**Proposal**:
- **Multi-Agent Threads**: Evolve the Telegram bridge to support multiple "Personas" in one group.
- **Implementation**: 
    - **Planner**: Breaks down the task.
    - **Worker**: Executes code.
    - **Reviewer**: Checks outputs.
- **Benefit**: Mimics a high-performing dev team. Isolation of concerns prevents context collapse and improves 1st-try success rates.

## 4. Interoperability: MCP Memory Bridge (Engram/Instagit Pattern)
**Context**: Our memory is currently isolated within GenieBot's `vector_store`.
**Proposal**:
- **Implementation**: Expose a standard MCP server interface for our `memory/` and `vector_store`.
- **Capability**: Allows external tools (Cursor, Claude Code, or other GenieBot instances) to query our project context using a unified protocol.
- **Trend**: "Context-on-demand" is replacing static training data.

## 5. Deployment Note: PicoClaw (Microkernel approach)
While our current stack is robust, we should monitor the **Go-based microkernel** approach for future low-resource edge deployments (e.g., running a GenieBot node on a Raspberry Pi for home automation).
