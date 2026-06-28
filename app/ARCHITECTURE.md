# Tutorial Viewer Server - Code Organization

This document describes the refactored server codebase structure.

## Directory Structure

```
app/
├── server.js              # Main entry point (simplified)
├── package.json           # Dependencies
├── start.bat              # Windows launcher
├── config/                # Configuration
│   └── index.js          # Port, paths, exclusions, constants
├── utils/                 # Utility functions
│   ├── markdown.js       # Markdown rendering & processing
│   └── formatters.js     # Text formatting utilities
├── services/              # Business logic
│   ├── navigation.js     # File tree builder
│   └── search.js         # Search indexing & query
├── routes/                # Route handlers
│   ├── landing.js        # Landing page (/)
│   ├── search.js         # Search API (/api/search)
│   └── content.js        # Content rendering (/*)
├── views/                 # EJS templates
│   └── layout.ejs        # Main template
└── public/                # Static assets
    └── style.css         # Styles
```

## Module Responsibilities

### `config/index.js`
- Application configuration (PORT, CONTENT_ROOT, EXCLUDED)
- Topic icons mapping

### `utils/markdown.js`
- Markdown rendering with syntax highlighting
- Link rewriting for relative paths
- Markdown stripping and heading extraction

### `utils/formatters.js`
- Text formatting (formatName, makeBreadcrumb)
- Search snippet generation
- File counting and icon selection

### `services/navigation.js`
- Builds navigation tree from file system
- Flattens tree structure for sequential navigation
- Initializes navigation data

### `services/search.js`
- Builds search index from markdown files
- Scores search results based on term matches
- Returns ranked search results

### `routes/landing.js`
- Renders the landing page with topic cards
- Displays topic statistics (sections, files)

### `routes/search.js`
- Handles `/api/search` API endpoint
- Returns JSON search results

### `routes/content.js`
- Renders markdown files as HTML
- Handles directory redirects to README.md
- Calculates reading time
- Provides prev/next navigation

## Benefits of This Structure

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Maintainability**: Easier to locate and modify specific functionality
3. **Testability**: Modules can be tested independently
4. **Readability**: Main server.js is now ~40 lines vs 459 lines
5. **Reusability**: Utilities and services can be reused across routes

## Import Pattern

All modules use CommonJS (`require`/`module.exports`) to match the existing codebase style.

Example:
```javascript
// In a module
const { formatName } = require('../utils/formatters');

// Exporting
module.exports = {
  formatName,
  makeBreadcrumb,
};
```

## Making Changes

- **Add a new configuration**: Edit `config/index.js`
- **Modify markdown rendering**: Edit `utils/markdown.js`
- **Change search algorithm**: Edit `services/search.js`
- **Add a new route**: Create a new file in `routes/` and wire it up in `server.js`
- **Update formatting logic**: Edit `utils/formatters.js`
