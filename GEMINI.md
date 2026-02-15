# GEMINI.md - Core Engineering Rules

- **Micro-Agents**: All agents must be located in `agents/` with isolated `venv/` and `src/` directories.
- **JSON Protocol**: All inter-process communication (IPC) must be strictly JSON-formatted.
- **No API Leakage**: Python scripts must NEVER call external AI APIs directly; they must rely on the Gateway wrapper for all external intelligence.
- **Ralph Loop**: On error, analyze stderr, refine the approach, and retry.
