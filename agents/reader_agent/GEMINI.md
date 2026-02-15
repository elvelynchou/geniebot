# Reader Agent (Content Extraction)

## 1. Agent Overview
**Purpose**: High-performance, production-grade web scraper that converts web pages into clean, LLM-ready Markdown.
**Engine**: Powered by `@vakra-dev/reader` (Node.js/Ulixee Hero).
**Best For**: 
- Reading articles, blogs, and documentation.
- Bypassing Cloudflare/TLS fingerprinting on content-heavy sites.
- Getting clean text without HTML noise.

## 2. Usage
```bash
# Basic Scrape
venv/bin/python3 src/main.py --url "https://example.com/article"
```

## 3. Comparison with stealth_browser
| Use Case | Recommended Agent |
| :--- | :--- |
| Login / Social Interaction | `stealth_browser` |
| Fast Markdown Reading | `reader_agent` |
| Bypassing Hard Anti-Bot | `reader_agent` |
| Taking Screenshots | `stealth_browser` |

## 4. Dependencies
- Node.js >= 18
- `npm install` and `npm run build` must be completed in the root.
