const express = require('express');
const path = require('path');

// Configuration
const { PORT } = require('./config');

// Services
const { initializeNavigation } = require('./services/navigation');
const { buildSearchIndex } = require('./services/search');

// Routes
const { getLandingPage } = require('./routes/landing');
const { searchAPI } = require('./routes/search');
const { getContent } = require('./routes/content');

// Markdown utilities
const { setWikiLinkMap } = require('./utils/markdown');

// Initialize Express app
const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Build navigation tree and search index on startup
const { navTree, flatFiles } = initializeNavigation();
buildSearchIndex(flatFiles);

// Build wikilink map: lowercase basename → relative path (for [[wikilink]] resolution)
const wikiMap = new Map();
for (const f of flatFiles) {
  const ext = path.extname(f.path);
  const base = path.basename(f.path, ext).toLowerCase();
  wikiMap.set(base, f.path);
  // Also index without leading numeric prefix (01-jvm-jdk-jre → jvm-jdk-jre)
  const noPrefix = base.replace(/^\d+[-_]/, '');
  if (noPrefix !== base) wikiMap.set(noPrefix, f.path);
}
setWikiLinkMap(wikiMap);

// Routes
app.get('/', getLandingPage(navTree));
app.get('/api/search', searchAPI);
app.get('/*', getContent(navTree, flatFiles));

// Start server (local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Tutorial viewer running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
