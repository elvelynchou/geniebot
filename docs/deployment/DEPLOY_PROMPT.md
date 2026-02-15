# 🧠 GenieBot (Bridge-03) Dialogue-Based Cloning Guide

Use these prompt sequences to rebuild the complete system via conversation.

## 🏁 Block 1: Foundation & The Mesh Protocol
> "Initialize GenieBot (Bridge-03) infrastructure. Create core directories. 
> Write `core/protocol.py` defining the `AgentMesh` class for Redis Pub/Sub signaling. 
> This is the bedrock of our autonomous coordination."

## 🏁 Block 2: The Kernel & AI Daemon
> "Build the AI scheduling kernel. Create `gateway/src/daemon.js`. 
> It must handle 429 errors by switching between `auto-gemini-3` and `auto-gemini-2.5`. 
> Integrate `core/ai_wrapper.py` using Python generators to yield Redis stream chunks."

## 🏁 Block 3: The Sentinel Guard
> "Implement the runtime safety layer. Create `agents/sentinel/src/checker.py` and `config/safety_policy.yaml`. 
> Then, modify `master.py` to call `Sentinel.vet_command()` before every `subprocess.Popen`. 
> Block 'rm', 'mkfs', and 'sudo apt' by default."

## 🏁 Block 4: Advanced Stealth Browser
> "Update `agents/stealth_browser/src/main.py`. 
> 1. Add `extract_semantic` using AX Tree.
> 2. Add `click_node` and `type_node` actions using backend IDs.
> 3. Inject the deep stealth JS patch (chrome.runtime, WebGL, languages) on every new document."

## 🏁 Block 5: The Vault & Autonomous Loop
> "Establish the Artifact Management system. Create `agents/vault/src/main.py` to subscribe to `image_ready` and `document_ready` events. 
> It must store files in a typed structure (`images/`, `documents/`, `snapshots/`) and generate JSON metadata."

## 🏁 Block 6: Finishing Touches
> "1. Update `reader_agent` with the `CodeMapper` utility for cgrep-style structural extraction.
> 2. Package current project standards into the `architect-genie` Agent Skill.
> 3. Initialize `SYSTEM_CHANGELOG.md` to track our progress."
