# 🕷️ Metodologia-Scrape

> Universal framework for capturing and processing AI conversation share links

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)](https://github.com/Deivisan/Metodologia-Scrape/releases)
[![Bun](https://img.shields.io/badge/runtime-Bun-ff69b4.svg)](https://bun.sh)
[![Android](https://img.shields.io/badge/platform-Android%20%7C%20Linux%20%7C%20Windows-green.svg)](#)

---

## 🎯 What is This?

Framework for **capturing, processing, and structuring** AI conversations (Grok Share, ChatGPT exports, Claude, etc.) into persistent context for AGI agents, analysis, and automation.

**Key Features:**
- ✅ Cloudflare bypass (Puppeteer Stealth validated)
- ✅ Multiple methodologies (Puppeteer, HTTP, Firecrawl API)
- ✅ MCP Server (Model Context Protocol)
- ✅ Multi-platform (Android/Termux, Linux, Windows, macOS)
- ✅ Multiple output formats (JSON, Markdown, HTML, Screenshot)

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape

# Install dependencies
bun install

# Test standalone capture (Puppeteer Stealth)
cd packages/mcp-grok-scraper
bun run tests/test-standalone.ts

# Or use MCP Server
bun run start  # Full (Puppeteer Stealth)
bun run start:light  # Light (HTTP only)
```

**Basic Usage:**

```typescript
import { grokScrape } from '@deivisan/mcp-grok-scraper/full';

const result = await grokScrape({
  url: 'https://grok.com/share/c2hhcmQtMg_...',
  headless: true,
  saveHtml: true
});

console.log(`Captured ${result.messageCount} messages`);
// Output: captures/grok_1768675109033.json
```

---

## 📚 Methodologies

### 1️⃣ Puppeteer Stealth (Recommended)

**Status:** ✅ Production (developed & tested on Android/Termux)

**Performance:**
- ⏱️ ~20s per conversation (Cloudflare bypass included)
- 📊 Avg 180+ messages extracted
- 💾 ~500KB output (JSON + MD + HTML)

**When to use:**
- Sites protected by Cloudflare/WAF
- Long conversations (>100 messages)
- Need for screenshots/full HTML

**Outputs:** JSON, Markdown, HTML, Screenshot

**Code:** `packages/mcp-grok-scraper/index-full.ts` (600+ lines)

---

### 2️⃣ HTTP Light (Fallback)

**Status:** ✅ Functional (limited scope)

**Performance:**
- ⏱️ ~3s per URL
- ❌ Fails with Cloudflare
- ✅ Works for unprotected public pages

**When to use:**
- Sites without anti-bot protection
- Fast text-only captures
- Resource-constrained environments

**Outputs:** JSON, Markdown

**Code:** `packages/mcp-grok-scraper/index.ts`

---

### 3️⃣ Firecrawl API (Tested ✅)

**Status:** ✅ Works with direct API calls

**Note from training:**
> "Firecrawl MCP funciona apenas usando API e link direto. Já testei e funciona."

**Performance:**
- ⏱️ ~3s per conversation
- ✅ Cloudflare bypass nativo
- 💰 Requires API key (paid service)

**Integration:** Coming soon (API wrapper for MCP)

---

### 4️⃣ Playwright (Limitations ⚠️)

**Status:** ⚠️ Known issues with Cloudflare

**From training docs:**
> "Às vezes Playwright tem limitações mesmo do Cloudflare"

**Use cases:**
- Sites without Cloudflare
- Cross-browser testing (Firefox, WebKit)
- Parallel captures

**Note:** Prefer Puppeteer Stealth for Grok Share

---

## 🤖 MCP Server

### Available Tools

| Tool | Function | Required Params | Outputs |
|------|----------|-----------------|---------|
| `grok_scrape` | Capture conversation | `url` | `uuid`, `messageCount`, `path` |
| `grok_read` | Read existing capture | `uuid` | Formatted content |
| `grok_list` | List all captures | — | Array of captures |
| `grok_context` | Generate AI context | `uuid` (optional) | Summary + structured messages |

### OpenCode Configuration

```json
{
  "mcpServers": {
    "grok-scraper": {
      "command": ["bun", "run", "/path/to/index-full.ts"],
      "env": {
        "HEADLESS": "true"
      }
    }
  }
}
```

### Agent Workflow

```typescript
// When agent receives Grok Share link
if (url.includes('grok.com/share')) {
  const { uuid } = await grok_scrape({ url, headless: true });
  const context = await grok_context({ uuid });
  // Agent now has full conversation memory
}
```

---

## 📱 Android / Termux Support

### Development Origin

**Critical Note:** The Puppeteer Stealth methodology was **developed and validated on Android (Termux)** before being ported to desktop.

**Environment:**
- Device: POCO X5 5G (Snapdragon 695, 8GB RAM)
- OS: Arch Linux ARM chroot (via proot-distro)
- Runtime: Bun 1.3.5
- Browser: Chromium bundled (via Puppeteer)

**Why Android?**
- ✅ Portable development environment
- ✅ Real mobile browser fingerprint
- ✅ Lower Cloudflare suspicion (mobile traffic)
- ✅ 24/7 availability for continuous scraping

### Installation (Termux)

```bash
# Install Termux from F-Droid (NOT Play Store)
pkg update && pkg upgrade
pkg install proot-distro

# Install Arch Linux ARM
proot-distro install archlinux
proot-distro login archlinux

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone repository
cd /sdcard/Projetos
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape

# Install deps & test
bun install
cd packages/mcp-grok-scraper
bun run tests/test-standalone.ts
```

**Performance on Android:**
- ⏱️ Same ~20s as desktop (Snapdragon 695 sufficient)
- 📊 Same extraction quality
- 💾 Slightly lower memory usage (~300MB vs ~500MB)

---

## 🧪 Testing

### Automated Tests

```bash
# Single test (fastest)
bun run test:single

# Full test suite
bun run test

# Standalone (no MCP)
bun run tests/test-standalone.ts
```

### Expected Output

```
✅ STANDALONE TEST COMPLETED
📊 Time: 19.06s
📝 Messages: 182
🔍 Cloudflare: Bypassed
💾 File: test_1768675109033.json
```

### Test Validation

- ✅ Cloudflare bypass (waits for "Just a moment" to disappear)
- ✅ Complete extraction (multiple CSS selectors)
- ✅ File generation (JSON, MD, HTML, PNG)
- ✅ Performance (<30s per conversation)
- ✅ Robustness (auto-retry on transient failures)

---

## ⚙️ Configuration

### Environment Variables

```bash
# Headless mode (default: true)
HEADLESS=true

# Output directory
OUTPUT_DIR=/path/to/captures

# Browser choice (future)
BROWSER=chromium  # chromium | firefox | webkit

# Firecrawl API (future)
FIRECRAWL_API_KEY=fc-xxx
```

### Browser Selection (Planned)

```typescript
// Future implementation
const CONFIG = {
  browser: process.env.BROWSER || 'chromium',
  headless: process.env.HEADLESS !== 'false'
};
```

---

## 📁 Project Structure

```
Metodologia-Scrape/
├── packages/
│   └── mcp-grok-scraper/          # Main MCP package
│       ├── index.ts               # HTTP light version
│       ├── index-full.ts          # Puppeteer Stealth (main)
│       ├── tests/                 # Automated tests
│       │   ├── test-standalone.ts # ✅ Validated
│       │   ├── test-all.ts        # Suite
│       │   └── test-single.ts     # Quick test
│       ├── captures/              # Output directory
│       └── package.json           # NPM package config
├── captures/                      # Global captures
├── treinamento/                   # Training docs (7 attempts logged)
│   └── TREINAMENTO_COMPLETO.md    # ✅ Full methodology
├── README.md                      # This file
├── CHANGELOG.md                   # Version history
├── ROADMAP.md                     # Development roadmap
└── scrape-grok.js                 # Standalone script (legacy)
```

---

## 🚧 Current Status & Known Issues

### ✅ Working (Production)

- Puppeteer Stealth Cloudflare bypass
- MCP Server (full & light versions)
- Android/Termux execution
- Multiple output formats
- Automated testing

### ⚠️ Known Limitations

1. **Playwright + Cloudflare:** Fails ~80% (use Puppeteer instead)
2. **HTTP Light:** Cannot bypass Cloudflare (documented)
3. **Firecrawl MCP:** Not integrated (API works, wrapper pending)
4. **Browser choice:** Hardcoded to Chromium (Firefox/WebKit coming)

### 🔄 In Progress (see ROADMAP.md)

- [ ] Firecrawl API integration
- [ ] Exa Search testing
- [ ] Tavily Extract validation
- [ ] Multi-browser support (Firefox, WebKit)
- [ ] Python multithreading (parallel captures)
- [ ] Smart caching (avoid re-scraping)

---

## 📦 Multiple Releases

### Planned Distribution Formats

```bash
# Source (for contributors)
git clone https://github.com/Deivisan/Metodologia-Scrape.git

# NPM package (bundled, minimal deps)
npm install @deivisan/mcp-grok-scraper

# Standalone binary (Bun compiled)
bunx @deivisan/mcp-grok-scraper scrape <url>

# Docker image (isolated environment)
docker run -v ./captures:/captures deivisan/grok-scraper <url>
```

### Release Strategy

Each methodology will have separate releases:

- `v2.x-full` - Puppeteer Stealth (batteries included)
- `v2.x-light` - HTTP only (minimal footprint)
- `v2.x-firecrawl` - Firecrawl API wrapper
- `v2.x-hybrid` - All methodologies (largest)

---

## 🤝 Contributing

### Areas Open for Contribution

- 🐛 Bug fixes (see Issues)
- ✨ New methodologies (Exa, Tavily, Apify)
- 📝 Documentation improvements
- 🧪 Test coverage expansion
- 🌐 Internationalization (EN, ES, PT-BR)
- 🎨 Dashboard web UI

### Contribution Workflow

```bash
# Fork & clone
git clone https://github.com/YOUR_USER/Metodologia-Scrape.git
cd Metodologia-Scrape

# Create feature branch
git checkout -b feat/my-feature

# Make changes & test
bun run test

# Commit with descriptive message
git commit -m "feat: add Exa Search integration"

# Push & create PR
git push origin feat/my-feature
```

**Useful for anyone who understands this repo's approach to apply similar methodology to other platforms (ChatGPT, Claude, Gemini shared conversations).**

---

## 🔗 Links

- **Repository:** https://github.com/Deivisan/Metodologia-Scrape
- **Issues:** https://github.com/Deivisan/Metodologia-Scrape/issues
- **Releases:** https://github.com/Deivisan/Metodologia-Scrape/releases
- **Author:** [@deivisan](https://github.com/Deivisan)

---

## 📄 License

MIT License - Free for commercial and personal use.

See [LICENSE](LICENSE) for details.

---

## 💡 Core Principles

- **Capture first, ask later** - Every share link deserves preservation
- **Robust code > Beautiful code** - Silent operation preferred
- **Multi-platform by default** - Android, Linux, Windows, macOS
- **Open methodology** - Documented failures and successes
- **Bun First** - Modern runtime, fast execution

---

**Version:** 2.0.1  
**Last Updated:** 2026-01-17  
**Developed on:** Android (Termux) + Windows 11  
**Runtime:** Bun 1.3.5  
**License:** MIT
