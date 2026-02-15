# Social Media Publisher Agent (socialpub)

## 1. Agent Overview
**Purpose**: Automatically post content and media to social media platforms using `stealth_browser`.
**Supported Platforms**: X (Twitter).
**Default Profile**: `lab_generator`.

## 2. Usage
```bash
# Post text to X
venv/bin/python3 src/main.py --text "Hello world from GenieBot!"

# Post text and image to X
venv/bin/python3 src/main.py --text "Check this out!" --image "path/to/image.jpg"

# Use a specific profile
venv/bin/python3 src/main.py --text "Special post" --profile "scout"
```

## 3. Configuration
- **Browser Control**: Relies on `stealth_browser` agent.
- **Operating Mode**: **STRICTLY FOREGROUND (GUI)**. 
- **Constraint**: The `--headless` flag MUST NEVER be used for social publication tasks to allow for manual intervention and to bypass anti-bot detections on X.
- **Environment**: Ensure the `DISPLAY` environment variable is accessible if running from a remote session.

## 4. Dependencies
- Standard Python 3 libraries.
- Requires `stealth_browser` to be functional and accounts to be logged in within the specified profile.
