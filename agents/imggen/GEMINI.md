# Image Generation Agent (imggen)

## 1. Agent Overview
**Purpose**: High-speed image generation using external APIs (ModelScope) or browser automation (Labflow).
**Primary Mode**: ModelScope API (Fastest, Default).
**Fallback/Secondary Mode**: Labflow (Stealth Browser) for high-quality Google Labs output.

## 2. Usage
```bash
# Default mode (ModelScope API)
venv/bin/python3 src/generate.py --prompt "A futuristic city"

# Specific engine mode (Labflow)
venv/bin/python3 src/generate.py --prompt "A futuristic city" --engine Labflow
```

## 3. Configuration
- **Output Directory**: `output/`
- **ModelScope API Token**: Managed in `src/generate.py`.
- **Engine Selection**: Default is `ModelScope`. Use `--engine Labflow` for browser-based generation.

## 4. Dependencies
- `requests`
- `Pillow`
- Requires `stealth_browser` agent for Labflow mode.
