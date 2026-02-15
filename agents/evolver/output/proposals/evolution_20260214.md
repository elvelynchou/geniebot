# Evolution Proposal 2026-02-14

## Executive Summary (Telegram)
🚀 **GenieBot Evolution Update**: Today's scan reveals key trends in **Token Efficiency** and **Agent Verification**. 
1. **Stealth Browser Upgrade**: Transitioning from full Accessibility Trees to "Actionable-Only" YAML maps to save ~60% tokens. 
2. **New Agent: SyncMaster**: Implementing Git-based state synchronization for resilient memory. 
3. **Skill Framework**: Adopting the 'OpenClaw' concept of "AI Skills" for specialized persona-driven tasks (e.g., Brand Voice/Steve Jobs mode).
4. **Validation Layer**: Proposing a 'QualityGate' agent to verify autonomous outputs before publication.

---

## 1. Optimization: Stealth Browser (Token Budgeting)
**Context**: Currently, `stealth_browser` provides `extract_semantic` which dumps the accessibility tree. While better than HTML, it still contains noise.
**Proposal**:
- **Compact Interaction Map**: Update `stealth_browser` to support an `extract_actionable` directive.
- **Implementation**: Filter the accessibility tree for interactive roles (`button`, `link`, `textbox`, `checkbox`, `menuitem`).
- **Format**: Return a minimal YAML-like structure with element IDs and short descriptions.
- **Impact**: Reduces token consumption per browser step by 50-70%, enabling more complex navigation within a single context window.

## 2. Research: OpenClaw & The "Skills" Paradigm
**Analysis**: OpenClaw (as seen on HN) promotes "AI Skills" as the new apps. A "Steve Jobs" skill helps maintain a specific design/strategy philosophy.
**Application to GenieBot**:
- **Persona Injection**: We can enhance our agents (like `socialpub`) by allowing them to load "Skill Modules".
- **Implementation**: Create `agents/socialpub/skills/` where JSON/Markdown files define specific tones or logic (e.g., `simplicity_first.md`).
- **Benefit**: Standardizes how we give agents "personality" without hardcoding it into the source code.

## 3. New Agent Proposal: SyncMaster (Infrastructure)
**Purpose**: Resilient, zero-dependency memory synchronization across environments.
**Capabilities**:
- **Git-Backbone**: Uses a local Git repository to track changes in `memory/` and `config/` directories.
- **Automated Sync**: Periodically pushes/pulls from a secure remote to ensure all GenieBot instances share the same state.
- **Inspiration**: `musecl-memory`.
- **Target**: Improves system reliability and enables "time-travel" debugging of agent states.

## 4. New Agent Proposal: QualityGate (Validation)
**Purpose**: A verify-before-release gateway for autonomous transactions and publications.
**Capabilities**:
- **Pre-flight Check**: Before `socialpub` posts or `imggen` delivers, `QualityGate` performs a safety and quality audit.
- **Proof of Work**: Ensures the generated content matches the system's `SOUL.md` and user-defined constraints.
- **Inspiration**: `Settld` (x402 gateway logic).
- **Impact**: Reduces "AI hallucinations" in public-facing outputs and increases user trust in autonomous mode.

## 5. Architectural Trends
- **YAML over JSON/HTML**: For structural representation to the LLM, YAML is proving more token-efficient and less prone to "bracket fatigue".
- **External State references**: Moving towards "Compact Element References" where the LLM only receives a tag (e.g., `[Btn:7]`) instead of the full element metadata.
