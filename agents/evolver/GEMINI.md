# Evolver Agent (Self-Optimization)

## 1. Agent Overview
**Purpose**: The "R&D Department" of GenieBot. Scans external tech trends, evaluates current system architecture, and proposes optimizations or new agents.
**Mode**: Reflective & Analytical.
**Safety**: strictly advisory. Cannot modify code directly without human approval.

## 2. Capabilities
- **Environmental Scanning**: Uses `reader_agent` to monitor GitHub and Tech News.
- **Self-Awareness**: Reads system `GEMINI.md` to understand current limitations.
- **Proposal Generation**: Creates detailed Markdown reports with actionable integration steps.

## 3. Configuration
- `config/sources.json`: List of URLs to monitor.
- `config/constraints.json`: System "No-Fly Zones" and priorities.
- `memory/history.md`: Tracks past analyses to prevent duplication.

## 4. Operational Flow
1. Scan defined sources.
2. Analyze against current system state.
3. Save detailed proposal to `output/proposals/`.
4. Send summary to Telegram via Master Engine.
5. Wait for human confirmation before implementing changes.

## 5. Deployment
Scheduled via `cronmaster` daily at 22:00.
