# Reference Lab Context: /etc/myapp/orcher/reference

## 1. Directory Overview
This directory serves as a **Sandbox & Analysis Lab**. 
It contains external GitHub projects downloaded for the sole purpose of **analysis, learning, and reference**.

**⚠️ SECURITY POLICY:** 
- Code in this directory should **NOT** be executed directly as part of the production workflow.
- It acts as a source of "DNA" (patterns, logic, architecture) for creating new native agents in the parent directory.

## 2. Standard Workflow: From Reference to Agent

### Phase 1: Ingest
Clone external repositories into this directory.
```bash
git clone https://github.com/example/awesome-tool.git ./reference/awesome-tool
```

### Phase 2: Analyze (Mandatory)
Before using any code, the Gemini Agent must perform a deep scan and generate a `ANALYSIS_REPORT.md` inside the project folder.

**The Analysis Report MUST include:**
1.  **Project Summary**: What does it do?
2.  **Architecture**: Directory structure, key classes, entry points.
3.  **Security Audit (Powered by `gemini-cli-security`)**:
    - [ ] **Automated Scan**: Execute `scan_vulnerable_dependencies` on the repo. **Must attach summary of findings.**
    - [ ] **Manual Review**: Check for malicious patterns, obfuscated code, or hardcoded secrets.
4.  **Migration Strategy**: How to port this functionality to our `orcher` micro-agent standard (e.g., isolating venv, standardizing logging).

### Phase 3: Implement
Build the new agent in the parent directory (`../<new_agent>`), using the reference code as a guide but strictly adhering to the project's `src/` + `venv/` + `GEMINI.md` conventions.

## 3. Registered References

*(Gemini will update this list as new projects are analyzed)*

- **[gemini_cli_server](./gemini_cli_server)**: Analyzed for Telegram Webhook patterns.
- **[gemini-cli-telegram-extension](./gemini-cli-telegram-extension)**: Analyzed for Tool-use patterns.
- **[reader](./reader)**: Production-grade web scraping and Markdown extraction engine. Analyzed for anti-bot and LLM-ready content extraction patterns.