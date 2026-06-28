# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A learning/tutorial repository with two components:
1. **Markdown tutorial content** — covering Python, PostgreSQL, TypeScript, React, System Design, API Security, Computer Networks, Operating Systems, DevOps, Flutter/Dart
2. **Tutorial viewer app** (`app/`) — Node.js/Express server that renders the markdown files in a browser

## App Commands

```bash
cd app && npm install   # install dependencies
npm start               # run on port 4000
npm run dev             # run with --watch (auto-restart on file changes)
```

No tests, linting, or CI/CD are configured.

## App Architecture

**`app/server.js`** is the entire backend:
- Builds a navigation tree at startup by recursively scanning `CONTENT_ROOT` (the repo root), excluding directories in `EXCLUDED` set
- Serves all routes via a single catch-all `GET /*` handler: resolves URL paths to `.md` files, directories redirect to `README.md`
- Renders markdown with `markdown-it` + a custom link-rewriting plugin that rewrites relative `.md` links to absolute app URLs (so cross-file navigation works in the browser)
- Path traversal protection: rejects any resolved path outside `CONTENT_ROOT`
- Exports `module.exports = app` for Vercel serverless deployment (configured in `vercel.json`)

**`app/views/layout.ejs`** — single EJS template used for all pages; receives `{ title, content, navTree, currentPath }`

**`app/public/style.css`** — all styles; uses CSS custom properties for light/dark theming via `[data-theme="dark"]`

## Content Structure

Each topic directory uses numbered subdirectories and files for learning order:
```
topic/
  README.md               # index / table of contents
  01_subtopic/
    README.md
    01_first_file.md
    02_second_file.md
```

The nav tree is built from the filesystem — adding new directories/files is picked up automatically on server restart.

## Deployment

Deployed to Vercel via `vercel.json`. The `includeFiles` config in `vercel.json` controls which content directories are bundled — **update it when adding new top-level topic directories**, otherwise they won't be available in production.

## Code Conventions

- CommonJS (`require`/`module.exports`), not ESM
- 2-space indentation, single quotes
- Constants: `UPPER_SNAKE_CASE`; variables/functions: `camelCase`; CSS: `kebab-case`
- Markdown files: H1 title, code blocks with language specifiers, numbered prefixes for ordering
