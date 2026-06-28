# AGENTS.md - Guidelines for AI Coding Agents

This document provides guidelines for AI coding agents working in this repository.

## Repository Overview

This is a **learning/tutorial repository** containing:
- **Tutorial Content**: Markdown files covering Python, PostgreSQL, TypeScript, and System Design
- **Tutorial Viewer App**: A Node.js/Express web application (`app/`) that serves and renders the tutorials

## Project Structure

```
learn/
├── app/                    # Tutorial Viewer (Node.js/Express)
│   ├── server.js          # Main entry point - Express server
│   ├── package.json       # Dependencies
│   ├── views/layout.ejs   # EJS template with navigation tree
│   ├── public/style.css   # Styles (light/dark theme)
│   └── start.bat          # Windows launcher
├── python/                # Python tutorials (FastAPI, LangChain, LangGraph)
├── postgresql/            # PostgreSQL tutorials (18 topic directories)
├── typescript/            # TypeScript tutorials (React, Express, NestJS)
├── system_design/         # System design tutorials
└── flutter_dart/          # Placeholder for future content
```

## Build/Lint/Test Commands

### Tutorial Viewer App (app/)

```bash
# Install dependencies
cd app && npm install

# Start the server (port 3000)
npm start

# Start with file watching (development)
npm run dev

# Windows: Double-click start.bat
```

**Note**: There are no tests, linting, or type checking configured for the app.

## Code Style Guidelines

### JavaScript (app/server.js)

**Formatting**:
- 2-space indentation
- No semicolons are used inconsistently - prefer including them
- Single quotes for strings
- Max line length: ~100 characters

**Imports**:
```javascript
// Use CommonJS require() syntax
const express = require('express');
const path = require('path');
const fs = require('fs');
```

**Naming Conventions**:
- Variables and functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` (e.g., `PORT`, `CONTENT_ROOT`, `EXCLUDED`)
- CSS classes: `kebab-case`

**Error Handling**:
- Use try/catch blocks for file operations
- Return appropriate HTTP status codes (403, 404)
- Render user-friendly error pages

### CSS (app/public/style.css)

- 2-space indentation, one property per line
- CSS custom properties (variables) in `:root`
- Reset/base styles first, then components, mobile styles last
- BEM-like naming: `.sidebar-nav`, `.toolbar-btn`
- Theme variables: `--bg`, `--text`, `--border`, `--link`

### EJS Templates (app/views/)

- Embedded JavaScript for dynamic content
- Keep logic minimal - prefer helper functions
- Use `<%- %>` for unescaped HTML, `<%= %>` for escaped output

### Markdown Content

**File Naming**:
- Directories: `00_quick_start/`, `01_basic_fundamentals/`
- Files: `01_variables_and_data_types.md`
- Use numbered prefixes for ordering

**Structure**:
- Start with H1 title matching the file name
- Include "What you'll learn" or objectives
- Use code blocks with language specifiers (```python, ```typescript)
- End with practice exercises or summary
- Include comparison tables for concept mappings

**Links**:
- Use relative paths: `./01_variables.md` or `../02_oops/`
- The server automatically rewrites `.md` links

## Key Files to Understand

| File | Purpose |
|------|---------|
| `app/server.js` | Express server, markdown rendering, navigation tree |
| `app/views/layout.ejs` | Page template, sidebar, theme toggle |
| `app/public/style.css` | All styles, CSS variables, responsive design |
| `python/README.md` | Tutorial index, learning paths |
| `typescript/README.md` | TypeScript roadmap |

## Dependencies (app/package.json)

- **express**: Web framework
- **ejs**: Template engine
- **markdown-it**: Markdown parser
- **markdown-it-task-lists**: Task list checkbox support
- **highlight.js**: Code syntax highlighting

## Architecture Notes

### Tutorial Viewer App

1. **Markdown Rendering**: Uses `markdown-it` with custom link rewriting plugin
2. **Navigation Tree**: Built at startup by scanning directories, excludes `app/`, `node_modules/`, `.git/`
3. **Routing**: Catch-all route serves `.md` files, directories redirect to `README.md`
4. **Theming**: CSS custom properties with `[data-theme="dark"]` selector

### Content Organization

- Each topic area has its own directory with numbered subdirectories
- `README.md` in each directory serves as the index/table of contents
- Files are numbered for learning progression: `01_`, `02_`, etc.

## Common Tasks

### Adding a New Tutorial Topic

1. Create directory: `newtopic/`
2. Add `newtopic/README.md` with table of contents
3. Add numbered markdown files: `01_introduction.md`, etc.
4. Restart server to rebuild navigation tree

### Modifying the Viewer App

1. Edit `app/server.js` for backend changes
2. Edit `app/public/style.css` for styling
3. Edit `app/views/layout.ejs` for template changes
4. Use `npm run dev` for auto-reload during development

## Environment

- **Node.js**: Required for running the tutorial viewer
- **Port**: 3000 (configurable via `PORT` environment variable)
- **Platform**: Cross-platform (Windows, macOS, Linux)

## Security Considerations

- Path traversal protection in `server.js` (validates paths stay within `CONTENT_ROOT`)
- HTML escaping for error messages
- No authentication required (local development tool)

## No CI/CD or Testing

This repository does not have test suites, linting configuration, CI/CD pipelines, or git hooks. When adding code, manually verify changes work correctly.

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
