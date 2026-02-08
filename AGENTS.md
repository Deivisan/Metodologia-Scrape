## 📋 AGENTS.md - Developer Guide for Coding Agents

> Context for AI agents working in this repository. This guide includes build commands, testing procedures, and code style guidelines.

---

## 🚀 PROJECT OVERVIEW

### Repository Identity
- **Name:** `Metodologia-Scrape`
- **Owner:** Deivison Santana (@deivisan)
- **Type:** Universal AI Conversation Scraping Framework
- **Stack:** Bun, TypeScript, Puppeteer Stealth, MCP (Model Context Protocol)
- **Status:** ⏳ Fase 2 (Sistema de Aliases) - 70% completo
- **GitHub:** https://github.com/Deivisan/Metodologia-Scrape

### Propósito
Criar sistema completo de **captura, processamento e orquestração** de conversas do Grok Share (X.com), culminando em assistente pessoal **JARVIS-like** com voz, aliases e multi-agentes.

---

## 🔧 BUILD & LINT COMMANDS

### Bun Package Manager (100% Bun - Node.js Purgado)
```bash
# Install dependencies
bun install

# Add a new dependency
bun add <package>

# Remove a dependency
bun remove <package>

# Clean cache
bun cache clean

# Update all dependencies
bun update
```

### Build Commands (MCP Grok Scraper)
```bash
# Build both full and light versions
cd packages/mcp-grok-scraper
bun run build:all

# Build full version with Puppeteer
bun run build

# Build light version (no Puppeteer, HTTP-only)
bun run build:light

# Build and watch (development mode)
bun run dev
```

### Linting & Formatting
```bash
# Run TypeScript type checking
bun run tsc --noEmit

# Run Bun's built-in linter
bun lint  # Check package.json for available scripts

# Run Prettier formatting
bunx prettier --write .
```

### Cleanup
```bash
# Remove build artifacts
rm -rf packages/mcp-grok-scraper/dist
rm -rf captures

# Clean node_modules and reinstall
rm -rf node_modules bun.lockb
bun install
```

---

## 🧪 TESTING

### Running Tests

#### All Tests
```bash
# Run all tests in the package
cd packages/mcp-grok-scraper
bun run test

# Run all tests with detailed output
bun run test --verbose
```

#### Single Test File
```bash
# Run a specific test file
cd packages/mcp-grok-scraper
bun run tests/test-single.ts

# Run individual test file directly
bun run tests/<test-file-name>.ts

# Run tests with specific pattern
bun test '*<pattern>*'
```

#### Standalone Test
```bash
# Test the scraper as a standalone module
cd packages/mcp-grok-scraper
bun run test:standalone
```

#### Browser Comparison Tests
```bash
# Run browser comparison tests (Playwright vs Puppeteer)
cd /home/deivi/Projetos/Metodologia-Scrape
bun run test-browser-comparison.ts
```

#### ShellSpec Tests (DevSan)
```bash
# Run ShellSpec tests (Bash/Shell testing)
cd /home/deivi/Projetos/DevSan
shellspec
shellspec spec/test_setup_spec.sh  # Run specific test file
```

### Test Coverage
```bash
# Run tests with coverage report
bun test --coverage
```

### Debugging Tests
```bash
# Run tests with debugger attached
bun --inspect test

# Run single test in debug mode
bun --inspect tests/test-single.ts
```

### Test Environment Variables
```bash
# Environment variables for debugging
SCRAPE_ENGINE=playwright bun test  # Force specific engine
DEBUG=true bun test               # Enable debug logs
```

---

## 💾 CODE STYLE GUIDELINES

### 1. General Principles
- **Bun First**: Always use Bun instead of npm/node/yarn
- **Direct Communication**: Keep responses concise and focused on functionality
- **Autonomy**: Act proactively without unnecessary permissions
- **Code Purpose**: Write code with clear intent and minimal complexity

### 2. File Structure & Naming
```typescript
// Use kebab-case for filenames and directories
packages/mcp-grok-scraper/
├── index.ts              // Light version (HTTP-only)
├── index-full.ts         // Full version (with Puppeteer)
├── capture-psyconnect.ts // Integration module
├── cli.ts                // Command-line interface
├── tests/                // Test files
└── dist/                 // Build output

// Use PascalCase for class names and types
class GrokScraper { }
type ConversationData = { }

// Use camelCase for variables and functions
const conversationData = { };
function processConversation() { }

// Use UPPER_SNAKE_CASE for constants and configuration
const CONFIG = {
  DEFAULT_TIMEOUT: 30000
};
```

### 3. Imports & Exports
```typescript
// Use ES modules (import/export)
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Group imports by type
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Export single default or named exports
export default class GrokScraper { }
export { grokScrape };
```

### 4. TypeScript Types
```typescript
// Use strict type definitions
interface ScrapeOptions {
  url: string;
  outputDir?: string;
  saveHtml?: boolean;
  saveScreenshot?: boolean;
}

// Use type annotations for all variables
const uuid: string = `grok_${Date.now()}`;
const files: string[] = [];

// Use Zod for validation
import * as z from 'zod';

const ScrapeSchema = z.object({
  url: z.string().url(),
  outputDir: z.string().optional(),
  saveHtml: z.boolean().optional(),
  saveScreenshot: z.boolean().optional()
});
```

### 5. Error Handling
```typescript
// Use try-catch with meaningful error messages
try {
  const response = await fetch(url);
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.statusCode}`);
  }
} catch (error) {
  console.error(`❌ Scraping failed: ${error.message}`);
  throw error; // Re-throw if you want to propagate
}

// Handle errors with proper context
function handleScrapeError(error: Error, url: string) {
  console.error(`🔴 Failed to scrape ${url}: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
}
```

### 6. Comments & Documentation
```typescript
/**
 * 🎯 MCP Grok Scraper - Model Context Protocol Server
 * Light version (no Puppeteer) - Works with Bun without bundling errors
 *
 * @author Deivison Santana (@deivisan)
 * @version 1.1.0
 * @date 2026-01-16
 *
 * 🎓 METHODOLOGY: Light HTTP with follow-redirects
 * Status: ✅ WORKING on OpenCode
 */

// Single line comments
const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  requestTimeout: 30000 // 30 seconds
};
```

### 7. Code Formatting
- **Indentation**: 2 spaces (not tabs)
- **Line Length**: Maximum 80 characters
- **Semicolons**: Optional (Bun's default)
- **Quotes**: Single quotes for strings
- **Object/Array Formatting**: Multi-line for complex structures

### 8. Git Commit Guidelines
```bash
# Commit message format
git commit -m "feat: add new feature"          # New feature
git commit -m "fix: resolve issue with X"     # Bug fix
git commit -m "refactor: optimize Y"          # Refactoring
git commit -m "docs: update documentation"    # Documentation
git commit -m "test: add tests for Z"         # Tests

# Good practices
- Keep commits atomic (one feature/fix per commit)
- Write descriptive messages (not "fix bug")
- Reference issues if applicable
```

---

## 🎯 KEY ARCHITECTURE FILES

### Core Files
- **`packages/mcp-grok-scraper/index.ts`** - Lightweight HTTP-only scraper
- **`packages/mcp-grok-scraper/index-full.ts`** - Full version with Puppeteer
- **`scrape.js`** - Universal scraping framework (Node.js/Bun compatible)
- **`packages/mcp-grok-scraper/capture-psyconnect.ts`** - PsyConnect integration
- **`test-browser-comparison.ts`** - Browser comparison tests

### Configuration Files
- **`tsconfig.json`** - TypeScript configuration
- **`package.json`** - Project dependencies and scripts
- **`.shellspec`** - ShellSpec testing configuration

### Documentation
- **`PROMPT_MASTER_V3.md`** - Sistema SAL (586 linhas)
- **`ROADMAP.md`** - 5 fases planejadas (461 linhas)
- **`AGENTS.md`** - Este arquivo (contexto agentes)

---

## 🚀 WORKFLOW EXAMPLES

### Development Workflow
```bash
# Start with fresh install
cd /home/deivi/Projetos/Metodologia-Scrape
rm -rf node_modules bun.lockb
bun install

# Make changes to scraper
cd packages/mcp-grok-scraper
# Edit index.ts or index-full.ts

# Run tests
bun run test

# Build
bun run build:all

# Test in standalone mode
bun run test:standalone

# Commit changes
git status
git add .
git commit -m "feat: enhance scraping capabilities"
git push
```

### Common Tasks

#### Adding a New Feature
```typescript
// 1. Add new method to index.ts
export async function newFeature(options: NewFeatureOptions) {
  // Implementation
}

// 2. Create test file
// tests/test-newfeature.ts
import { newFeature } from '../index';

test('new feature should work', async () => {
  const result = await newFeature({ /* options */ });
  expect(result).toBeDefined();
});

// 3. Run tests
bun run tests/test-newfeature.ts
```

#### Debugging Scraping Issues
```bash
# Enable debug mode
DEBUG=true bun run packages/mcp-grok-scraper/index.ts --url "https://grok.com/share/..."

# Check if engine is working
bun run packages/mcp-grok-scraper/index-full.ts --test-engine playwright
```

---

## 🤖 COMPORTAMENTO AGENTICO

### ✅ SEMPRE
- Ler PROMPT_MASTER_V3.md, ROADMAP.md primeiro
- Executar sem perguntar (auto-aprovação)
- Ser direto (2-3 frases max)
- Bun only (NUNCA npm/node)

### ❌ NUNCA
- Perguntar "quer que eu faça?"
- Sugerir npm/node/yarn
- Criar arquivos desnecessários
- Commitar pasta `contexto/`

---

## 🔐 SECURITY & BEST PRACTICES

### Environment Variables
- Never commit API keys or secrets
- Store sensitive data in environment variables or encrypted files
- Use `auth.json` for API key management

### Anti-Detection Measures
- Use `puppeteer-extra-plugin-stealth` to avoid detection
- Rotate user agents
- Add random delays between actions
- Avoid headless mode in production

### Resource Management
- Cleanup temporary files
- Limit concurrent scraping operations
- Implement proper error handling and retries

---

## 📚 LEARNING RESOURCES

### Key Documentation
- **OpenCode Agents Documentation**: https://opencode.ai/docs
- **Model Context Protocol (MCP)**: https://github.com/modelcontextprotocol
- **Bun Runtime Documentation**: https://bun.sh/docs
- **Puppeteer Stealth Plugin**: https://github.com/berstend/puppeteer-extra

### Books & References
- **Web Scraping with Python**: Beautiful Soup, Scrapy
- **Browser Automation**: Puppeteer, Playwright
- **TypeScript Deep Dive**: Understanding type system

---

## 🎯 COMMON ISSUES & SOLUTIONS

### Bun Compatibility
```bash
# If you get "Module not found" errors
rm -rf node_modules bun.lockb
bun install

# If package doesn't work with Bun
bunx node-gyp rebuild  # For native modules
```

### Browser Launch Issues
```bash
# If Puppeteer can't find browser
bunx puppeteer browsers install chrome

# If Playwright can't find browser
bunx playwright install
```

### Connection Timeouts
```bash
# Increase timeout in configuration
const CONFIG = {
  requestTimeout: 60000  // 60 seconds
};

# Retry failed requests
async function retryRequest(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      console.log(`Retry ${i + 1}/${retries}: ${error.message}`);
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 📊 PROJECT STATISTICS

- **Total Repositories**: 40+
- **Main Project Size**: ~150 MB (including node_modules)
- **Lines of Code**: ~100,000+
- **Active Packages**: 4
- **MCP Servers**: 10+

---

**Last Updated**: Sun Feb 08 2026  
**Generated by**: OpenCode Agent  
**Version**: 2.0

*This AGENTS.md file contains all the information needed for coding agents to work effectively in this repository. It covers build commands, testing procedures, and code style guidelines.*